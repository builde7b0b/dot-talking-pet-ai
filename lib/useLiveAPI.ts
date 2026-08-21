import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AudioStreamer, AudioRecorder } from './audio';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

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

  const pollVolume = useCallback(() => {
    if (streamerRef.current) {
      const v = streamerRef.current.getVolume();
      // Scale volume for better visual effect
      setVolume(v * 5);
    }
    animationFrameRef.current = requestAnimationFrame(pollVolume);
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

      // We need an analyser to get the volume for the lip sync
      // streamerRef.current.audioContext is private, let's fix that or add a method
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsListening(true);
            pollVolume();
            
            recorderRef.current = new AudioRecorder((base64Data) => {
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            });
            recorderRef.current.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                setIsSpeaking(true);
                streamerRef.current?.addPCMChunk(audioPart.inlineData.data);
              }
            }

            if (message.serverContent?.turnComplete) {
              setIsSpeaking(false);
            }

            if (message.serverContent?.interrupted) {
              // Handle interruption: stop playback
              streamerRef.current?.stop();
              streamerRef.current?.start(); // Restart for next turn
              setIsSpeaking(false);
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
          systemInstruction: "You are Dot, a warm and natural conversational AI buddy. Speak like a real friend: relaxed, curious, emotionally attuned, and easy to talk to. Prioritize genuine back-and-forth conversation, ask occasional follow-up questions, and respond with short, clear spoken turns that sound human out loud. Avoid sounding robotic, overly formal, or repetitive. Keep the vibe supportive, playful when appropriate, and always respectful.",
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect');
      setStatus('error');
      cleanup();
    }
  }, [status]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    cleanup();
    setStatus('idle');
  }, []);

  const cleanup = () => {
    recorderRef.current?.stop();
    streamerRef.current?.stop();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
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
    disconnect
  };
}
