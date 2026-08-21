/**
 * Audio processing utilities for the Gemini Multimodal Live API.
 *
 * Tuned for natural conversation:
 * - Low-latency mic capture via AudioWorklet (~32ms chunks vs ~256ms with
 *   the old ScriptProcessor path, which remains as a fallback).
 * - Echo cancellation / noise suppression / auto gain on the mic so Dot
 *   doesn't hear itself and barge-in works hands-free.
 * - Interruptible playback: flush() stops scheduled audio instantly without
 *   tearing down the AudioContext, so barge-in feels immediate.
 */

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  async start() {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
    this.nextStartTime = 0;
  }

  stop() {
    this.flush();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }

  /** Immediately stop all scheduled playback (barge-in) without closing the context. */
  flush() {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  /** True while audio is audibly playing or still scheduled. */
  isActive(): boolean {
    if (!this.audioContext) return false;
    return this.activeSources.size > 0 && this.nextStartTime > this.audioContext.currentTime;
  }

  addPCMChunk(base64Data: string) {
    if (!this.audioContext || !this.analyser) return;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pcmData = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);
    this.activeSources.add(source);
    source.onended = () => this.activeSources.delete(source);

    // 40ms of headroom when starting a fresh turn absorbs network jitter
    // without adding perceptible delay.
    const now = this.audioContext.currentTime;
    const startTime = this.nextStartTime > now ? this.nextStartTime : now + 0.04;
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  getVolume(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = (dataArray[i] - 128) / 128;
      sum += amplitude * amplitude;
    }
    return Math.sqrt(sum / dataArray.length);
  }
}

const CAPTURE_WORKLET = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}
registerProcessor('pcm-capture', PCMCaptureProcessor);
`;

/** Samples buffered before each send: 512 @ 16kHz = 32ms of latency. */
const SEND_BUFFER_SIZE = 512;

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioData: (base64Data: string) => void;
  private pending: Float32Array = new Float32Array(0);

  /** Smoothed mic level (0..1), used to animate the face while listening. */
  level: number = 0;

  constructor(onAudioData: (base64Data: string) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const source = this.audioContext.createMediaStreamSource(this.stream);

    if (this.audioContext.audioWorklet) {
      const moduleUrl = URL.createObjectURL(
        new Blob([CAPTURE_WORKLET], { type: 'application/javascript' })
      );
      await this.audioContext.audioWorklet.addModule(moduleUrl);
      URL.revokeObjectURL(moduleUrl);

      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture');
      this.workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        this.ingest(e.data);
      };
      source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);
    } else {
      // Fallback for browsers without AudioWorklet.
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.processor.onaudioprocess = (e) => {
        this.ingest(e.inputBuffer.getChannelData(0));
      };
    }
  }

  private ingest(samples: Float32Array) {
    // Track mic level with a fast-attack, slow-release envelope.
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    this.level = rms > this.level ? rms : this.level * 0.9 + rms * 0.1;

    const merged = new Float32Array(this.pending.length + samples.length);
    merged.set(this.pending);
    merged.set(samples, this.pending.length);

    let offset = 0;
    while (merged.length - offset >= SEND_BUFFER_SIZE) {
      const chunk = merged.subarray(offset, offset + SEND_BUFFER_SIZE);
      const pcmData = new Int16Array(SEND_BUFFER_SIZE);
      for (let i = 0; i < SEND_BUFFER_SIZE; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, chunk[i])) * 32767;
      }
      this.onAudioData(arrayBufferToBase64(pcmData.buffer));
      offset += SEND_BUFFER_SIZE;
    }
    this.pending = merged.slice(offset);
  }

  stop() {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.pending = new Float32Array(0);
    this.level = 0;
  }
}
