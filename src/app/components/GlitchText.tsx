import { useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Always glitch, not just on hover */
  always?: boolean;
}

export function GlitchText({ text, className = "", style, always = false }: GlitchTextProps) {
  const [hovered, setHovered] = useState(false);
  const active = always || hovered;

  return (
    <>
      <span
        className={`glitch-root ${active ? "glitch-active" : ""} ${className}`}
        data-text={text}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {text}
      </span>

      <style>{`
        .glitch-root {
          position: relative;
          display: inline-block;
          color: #00ff9d;
          text-shadow: 0 0 10px #00ff9d, 0 0 20px rgba(0,255,157,0.4);
          cursor: default;
          user-select: none;
        }
        .glitch-root.glitch-active {
          animation: glitch-main 0.4s steps(1) infinite;
        }
        .glitch-root::before,
        .glitch-root::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          opacity: 0;
        }
        .glitch-root.glitch-active::before {
          color: #ff3b3b;
          text-shadow: -3px 0 #ff3b3b;
          opacity: 1;
          animation: glitch-before 0.35s steps(2) infinite;
          clip-path: polygon(0 15%, 100% 15%, 100% 40%, 0 40%);
        }
        .glitch-root.glitch-active::after {
          color: #00ffff;
          text-shadow: 3px 0 #00ffff;
          opacity: 1;
          animation: glitch-after 0.35s steps(2) infinite;
          clip-path: polygon(0 60%, 100% 60%, 100% 85%, 0 85%);
        }
        @keyframes glitch-main {
          0%   { transform: translate(0); }
          20%  { transform: translate(-2px, 1px); }
          40%  { transform: translate(2px, -1px); }
          60%  { transform: translate(-1px, 2px); }
          80%  { transform: translate(1px, -2px); }
          100% { transform: translate(0); }
        }
        @keyframes glitch-before {
          0%   { transform: translate(-3px, 0); }
          33%  { transform: translate(3px, 1px); }
          66%  { transform: translate(-2px, -1px); }
          100% { transform: translate(-3px, 0); }
        }
        @keyframes glitch-after {
          0%   { transform: translate(3px, 0); }
          33%  { transform: translate(-3px, -1px); }
          66%  { transform: translate(2px, 1px); }
          100% { transform: translate(3px, 0); }
        }
      `}</style>
    </>
  );
}
