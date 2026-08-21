import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, PowerOff, AlertCircle, Info, Heart, Coffee, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DotFace } from '@/components/DotFace';
import { useLiveAPI } from '@/lib/useLiveAPI';

export default function App() {
  const { status, volume, isSpeaking, isListening, error, connect, disconnect } = useLiveAPI();
  const [showInfo, setShowInfo] = useState(false);

  // Auto-connect if the user wants? Maybe not, better to have a clear start button.
  
  const handleToggleConnection = () => {
    if (status === 'idle' || status === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white/20 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <main className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Badge variant="outline" className="bg-white/5 border-white/10 text-white/50 font-mono tracking-tighter uppercase text-[10px]">
              Project: DOT-PET-01
            </Badge>
            <Badge variant="outline" className={`border-white/10 font-mono tracking-tighter uppercase text-[10px] ${
              status === 'connected' ? 'bg-green-500/20 text-green-400' : 
              status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' : 
              status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30'
            }`}>
              Status: {status}
            </Badge>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
          >
            DOT
          </motion.h1>
          <p className="text-white/40 text-sm font-mono max-w-xs">
            Your conversational AI buddy for natural back-and-forth chats.
          </p>
        </div>

        {/* Face Container */}
        <Card className="w-full aspect-square max-w-[450px] bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <CardContent className="p-0 h-full flex items-center justify-center relative">
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-10">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/20" />
              ))}
            </div>
            
            <DotFace 
              volume={volume} 
              isSpeaking={isSpeaking} 
              isListening={isListening} 
              status={status} 
            />

            {/* Corner Accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/20" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/20" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/20" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/20" />
            
            {/* Audio Visualizer (Small) */}
            {status === 'connected' && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: isSpeaking ? [4, Math.random() * 24 + 4, 4] : (isListening ? [4, Math.random() * 12 + 4, 4] : 4)
                    }}
                    transition={{ repeat: Infinity, duration: 0.2, delay: i * 0.05 }}
                    className="w-1 bg-white/30 rounded-full"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="flex items-center gap-4 w-full">
            <Button
              onClick={handleToggleConnection}
              disabled={status === 'connecting'}
              className={`flex-1 h-14 rounded-2xl font-bold text-lg transition-all duration-500 ${
                status === 'connected' 
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20' 
                : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
              }`}
            >
              {status === 'connected' ? (
                <><PowerOff className="mr-2 h-5 w-5" /> Disconnect</>
              ) : (
                <><Power className="mr-2 h-5 w-5" /> Start Chatting</>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setShowInfo(!showInfo)}
            >
              <Info className="h-5 w-5 text-white/50" />
            </Button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 text-red-400 text-xs font-mono bg-red-400/10 p-3 rounded-xl border border-red-400/20 w-full"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Features / Quick Actions */}
          {status === 'connected' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-3 w-full"
            >
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 transition-colors cursor-default">
                <Coffee className="h-4 w-4" />
                <span className="text-[10px] font-mono uppercase">Break</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 transition-colors cursor-default">
                <Zap className="h-4 w-4" />
                <span className="text-[10px] font-mono uppercase">Focus</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/80 transition-colors cursor-default">
                <Heart className="h-4 w-4" />
                <span className="text-[10px] font-mono uppercase">Mood</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Info Overlay */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151515] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 tracking-tight">About Dot</h2>
              <div className="space-y-4 text-white/60 text-sm leading-relaxed">
                <p>
                  Dot is a real-time AI companion powered by Gemini 3.1 Flash Live. 
                  Designed to feel like a natural, conversational buddy you can talk to anytime.
                </p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>Real-time voice interaction with low latency.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>Natural pacing and friendly conversational style.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span>Supportive, warm personality with light humor.</span>
                  </li>
                </ul>
                <p className="text-white/30 text-xs font-mono mt-6">
                  Requires microphone access. Audio is processed in real-time by Google Gemini.
                </p>
              </div>
              <Button 
                className="w-full mt-8 rounded-xl bg-white text-black hover:bg-white/90"
                onClick={() => setShowInfo(false)}
              >
                Got it
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Details */}
      <footer className="fixed bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">System Version</span>
          <span className="text-[10px] font-mono text-white/40">V3.1.0-LIVE</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Coordinates</span>
          <span className="text-[10px] font-mono text-white/40">40.7128° N, 74.0060° W</span>
        </div>
      </footer>
    </div>
  );
}
