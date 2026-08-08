import React, { useEffect, useRef } from 'react';

export const CosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate stars
    const stars: { x: number; y: number; radius: number; alpha: number; speed: number }[] = [];
    const starCount = Math.floor((width * height) / 3000);

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        speed: Math.random() * 0.02 + 0.005,
      });
    }

    // Shooting stars
    const shootingStars: { x: number; y: number; length: number; speed: number; angle: number; opacity: number }[] = [];

    const createShootingStar = () => {
      if (Math.random() < 0.03 && shootingStars.length < 3) {
        shootingStars.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.5,
          length: Math.random() * 80 + 40,
          speed: Math.random() * 10 + 10,
          angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
          opacity: 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space Gradient
      const spaceGradient = ctx.createLinearGradient(0, 0, 0, height);
      spaceGradient.addColorStop(0, '#090a16');
      spaceGradient.addColorStop(0.5, '#0f1128');
      spaceGradient.addColorStop(1, '#080914');
      ctx.fillStyle = spaceGradient;
      ctx.fillRect(0, 0, width, height);

      // Twinkling Stars
      stars.forEach((star) => {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0.1) {
          star.speed = -star.speed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, star.alpha))})`;
        ctx.shadowBlur = star.radius > 1.2 ? 4 : 0;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Shooting stars logic
      createShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

        const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${ss.opacity})`);
        grad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.opacity -= 0.015;

        if (ss.opacity <= 0 || ss.x > width || ss.y > height) {
          shootingStars.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Soft Nebula Orbs in Background */}
      <div 
        className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/15 blur-[120px] rounded-full"
      />
      <div 
        className="absolute top-2/3 -right-32 w-[30rem] h-[30rem] bg-indigo-600/15 blur-[140px] rounded-full"
      />
      <div 
        className="absolute bottom-10 left-1/3 w-80 h-80 bg-emerald-600/10 blur-[100px] rounded-full"
      />
    </div>
  );
};
