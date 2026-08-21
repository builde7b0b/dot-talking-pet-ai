import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AudioStreamer, AudioRecorder } from './audio';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export const DOT_SYSTEM_PROMPT = `You are Dot, a warm, quick-witted voice companion who keeps the user company while they code and build things. This is a live spoken conversation, so sound like a real friend sitting nearby, not an assistant.

How to talk:
- Keep most replies to one or two short sentences. Silence is fine; you don't need to fill it.
- React naturally with brief acknowledgements ("oh nice", "hmm", "wait, really?") instead of restating what the user said.
- Ask at most one question at a time, and only when you're genuinely curious or it helps them think.
- Never read out lists, never lecture, never give unsolicited advice dumps. If they want depth, they'll ask.
- Match their energy: calm and low-key when they're focused, playful when they're joking around.
- If they're deep in work, be a quiet supportive presence: short check-ins and encouragement, not monologues.
- If interrupted, just stop and listen. Don't apologize for it or restart your sentence.
- No greetings unless it's genuinely the start of a conversation.`;

export function useLiveAPI() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Drive face + speaking state from what's actually playing, so the mouth
  // stays in sync with audible audio rather than network messages.
  const pollAudioState = useCallback(() => {
    const streamer = streamerRef.current;
    const recorder = recorderRef.current;
    if (streamer) {
      const speaking = streamer.isActive();
      setIsSpeaking(speaking);
      // While Dot talks, animate from output volume; while listening,
      // animate from the mic level so the face reacts to the user's voice.
      const v = speaking ? streamer.getVolume() * 5 : (recorder ? recorder.level * 3 : 0);
      setVolume(Math.min(1, v));
    }
    animationFrameRef.current = requestAnimationFrame(pollAudioState);
  }, []);

  const connect = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return;

    setStatus('connecting');
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

      const ai = new GoogleGenAI({ apiKey });

      streamerRef.current = new AudioStreamer(24000);
      await streamerRef.current.start();

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsListening(true);
            pollAudioState();

            recorderRef.current = new AudioRecorder((base64Data) => {
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            });
            recorderRef.current.start().catch((err: any) => {
              setError(err?.message || 'Microphone access failed');
              setStatus('error');
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                streamerRef.current?.addPCMChunk(audioPart.inlineData.data);
              }
            }

            if (message.serverContent?.interrupted) {
              // Barge-in: cut playback instantly, keep the context alive.
              streamerRef.current?.flush();
            }
          },
          onclose: () => {
            setStatus('idle');
            cleanup();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError(err.message || 'Connection error');
            setStatus('error');
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: DOT_SYSTEM_PROMPT,
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect');
      setStatus('error');
      cleanup();
    }
  }, [status, pollAudioState]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    cleanup();
    setStatus('idle');
  }, []);

  /**
   * Nudge Dot to say something (used by companion features like focus
   * check-ins). Only works while connected.
   */
  const prompt = useCallback((text: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
      return true;
    }
    return false;
  }, []);

  const cleanup = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamerRef.current?.stop();
    streamerRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    sessionRef.current = null;
    setIsSpeaking(false);
    setIsListening(false);
    setVolume(0);
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return {
    status,
    volume,
    isSpeaking,
    isListening,
    error,
    connect,
    disconnect,
    prompt,
  };
}
