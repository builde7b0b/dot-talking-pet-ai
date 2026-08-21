import React, { useEffect, useRef, useMemo } from 'react';

interface DotFaceProps {
  volume: number; // 0 to 1
  isSpeaking: boolean;
  isListening: boolean;
  status: 'idle' | 'connecting' | 'connected' | 'error';
}

export const DotFace: React.FC<DotFaceProps> = ({ volume, isSpeaking, isListening, status }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Face parameters
  const ROWS = 24;
  const COLS = 24;
  const DOT_SPACING = 12;
  
  const dots = useMemo(() => {
    const d = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        d.push({
          baseX: c * DOT_SPACING,
          baseY: r * DOT_SPACING,
          x: c * DOT_SPACING,
          y: r * DOT_SPACING,
          size: 2,
        });
      }
    }
    return d;
  }, []);

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = (COLS * DOT_SPACING) / 2;
    const centerY = (ROWS * DOT_SPACING) / 2;
    
    dots.forEach((dot, i) => {
      const dx = dot.baseX - centerX;
      const dy = dot.baseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Face shape (circle mask)
      const faceRadius = 100;
      const inFace = dist < faceRadius;
      
      if (!inFace) return;

      let offsetX = 0;
      let offsetY = 0;
      let size = 2;
      let color = 'rgba(255, 255, 255, 0.2)';

      // Eyes
      const eyeY = -30;
      const eyeX = 35;
      const isEye = (Math.abs(dy - eyeY) < 15 && Math.abs(Math.abs(dx) - eyeX) < 10);
      
      if (isEye) {
        const blink = Math.sin(time / 500) > 0.95;
        size = blink ? 1 : 4;
        color = 'rgba(255, 255, 255, 0.8)';
      }

      // Mouth
      const mouthY = 30;
      const mouthWidth = 40;
      const isMouth = (Math.abs(dy - mouthY) < 10 && Math.abs(dx) < mouthWidth);
      
      if (isMouth) {
        const mouthOpen = isSpeaking ? volume * 20 : (isListening ? Math.sin(time / 100) * 2 : 0);
        const distToMouthCenter = Math.abs(dx) / mouthWidth;
        // Curve the mouth
        const curve = (1 - distToMouthCenter * distToMouthCenter) * mouthOpen;
        offsetY = curve;
        size = 3;
        color = 'rgba(255, 255, 255, 0.9)';
      }

      // Idle breathing/movement
      const breathe = Math.sin(time / 1000 + dist / 50) * 2;
      if (!isMouth && !isEye) {
        offsetY += breathe;
        size += Math.sin(time / 500 + i) * 0.5;
      }

      // Status colors
      if (status === 'connecting') {
        color = `rgba(255, 200, 0, ${0.3 + Math.sin(time / 200) * 0.2})`;
      } else if (status === 'error') {
        color = 'rgba(255, 50, 50, 0.5)';
      } else if (isListening) {
        color = `rgba(100, 200, 255, ${0.5 + Math.sin(time / 100) * 0.3})`;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dot.baseX + offsetX, dot.baseY + offsetY, size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [volume, isSpeaking, isListening, status]);

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[400px] mx-auto">
      <canvas
        ref={canvasRef}
        width={COLS * DOT_SPACING}
        height={ROWS * DOT_SPACING}
        className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
      />
      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-full">
          <span className="text-white/50 font-mono text-sm uppercase tracking-widest">Offline</span>
        </div>
      )}
    </div>
  );
};
