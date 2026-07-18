import { useEffect, useRef } from "react";

interface MatrixProgressProps {
  progress: number;
}

const CHARS = "01>$#@!%&ABCDEFabcdef";

export function MatrixProgress({ progress }: MatrixProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 600;
    const H = canvas.offsetHeight || 56;
    canvas.width = W;
    canvas.height = H;

    const COL_W = 13;
    const cols = Math.floor(W / COL_W);

    if (dropsRef.current.length !== cols) {
      dropsRef.current = Array(cols).fill(0).map(() => Math.random() * -H);
    }

    const draw = () => {
      // Semi-transparent fade — darker = longer trails
      ctx.fillStyle = "rgba(5, 10, 10, 0.25)";
      ctx.fillRect(0, 0, W, H);

      const fillWidth = (progress / 100) * W;

      for (let i = 0; i < cols; i++) {
        const colX = i * COL_W;
        if (colX > fillWidth) continue;

        const y = dropsRef.current[i];
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];

        // Head — bright cyan/white
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 8;
        ctx.fillText(char, colX, y);

        // Trail — neon green, fading
        ctx.font = "11px monospace";
        for (let t = 1; t <= 5; t++) {
          const alpha = 1 - t * 0.18;
          ctx.fillStyle = `rgba(0, 255, 157, ${alpha})`;
          ctx.shadowColor = "#00ff9d";
          ctx.shadowBlur = 4;
          const trailChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillText(trailChar, colX, y - t * 12);
        }

        ctx.shadowBlur = 0;

        dropsRef.current[i] += 12;
        if (dropsRef.current[i] > H + 20) {
          dropsRef.current[i] = Math.random() * -30;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [progress]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 60,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(0,255,157,0.3)",
        background: "rgba(0,0,0,0.6)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {/* Overlay labels */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", zIndex: 2, pointerEvents: "none",
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#00ff9d", textShadow: "0 0 8px #00ff9d", letterSpacing: "0.15em" }}>
          ANALYZING...
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#00ffff", textShadow: "0 0 8px #00ffff" }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
