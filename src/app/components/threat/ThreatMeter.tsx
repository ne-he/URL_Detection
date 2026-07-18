import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { confidenceToColor, useAudioFeedback } from './useAudioFeedback';

interface ThreatMeterProps {
  confidence: number | null;
  label: string | null;
}

// SVG gauge constants
const RADIUS = 70;
const STROKE_WIDTH = 12;
const CENTER = 90;
const CIRCUMFERENCE = Math.PI * RADIUS; // half circle

function confidenceToStrokeDashoffset(confidence: number): number {
  // 0% = full offset (empty), 100% = 0 offset (full)
  return CIRCUMFERENCE * (1 - confidence / 100);
}

function confidenceToAngle(confidence: number): number {
  // -90deg (left) to +90deg (right) = 180deg range
  return -90 + (confidence / 100) * 180;
}

export function ThreatMeter({ confidence, label }: ThreatMeterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [audioOn, setAudioOn] = useState(
    () => localStorage.getItem('phishguard_audio_enabled') !== 'false',
  );
  const { playBeep, setAudioEnabled } = useAudioFeedback();
  const prevConfidence = useRef<number | null>(null);

  useEffect(() => {
    if (confidence === null) {
      setDisplayValue(0);
      return;
    }

    // Count-up animation
    const end = confidence;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Play audio only on new result
    if (prevConfidence.current !== confidence) {
      prevConfidence.current = confidence;
      playBeep(confidence);
    }
  }, [confidence, playBeep]);

  const toggleAudio = () => {
    const next = !audioOn;
    setAudioOn(next);
    setAudioEnabled(next);
  };

  const color = confidenceToColor(displayValue);
  const angle = confidenceToAngle(displayValue);
  const strokeDashoffset = confidenceToStrokeDashoffset(displayValue);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 180, height: 100 }}>
        <svg width="180" height="100" viewBox="0 0 180 100">
          {/* Background arc */}
          <path
            d={`M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
          {/* Colored progress arc */}
          <motion.path
            d={`M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          {/* Needle */}
          <motion.line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - RADIUS + 8}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              transformOrigin: `${CENTER}px ${CENTER}px`,
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          />
          {/* Center pivot */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {/* Labels */}
          <text
            x="18"
            y="95"
            fill="rgba(224,224,224,0.4)"
            fontSize="9"
            fontFamily="monospace"
          >
            0
          </text>
          <text
            x="85"
            y="20"
            fill="rgba(224,224,224,0.4)"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="middle"
          >
            50
          </text>
          <text
            x="155"
            y="95"
            fill="rgba(224,224,224,0.4)"
            fontSize="9"
            fontFamily="monospace"
          >
            100
          </text>
        </svg>
        {/* Center value */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color,
              textShadow: `0 0 10px ${color}`,
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {confidence !== null ? `${displayValue}%` : '--'}
          </p>
          {label && (
            <p
              style={{
                fontSize: 9,
                letterSpacing: '0.15em',
                color: label === 'PHISHING' ? '#ff3b3b' : '#00ff9d',
                margin: 0,
              }}
            >
              {label}
            </p>
          )}
        </div>
      </div>
      {/* Audio toggle */}
      <button
        onClick={toggleAudio}
        title={audioOn ? 'Mute audio feedback' : 'Enable audio feedback'}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '4px 8px',
          cursor: 'pointer',
          color: audioOn ? 'var(--cyber-accent)' : 'rgba(224,224,224,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
        }}
      >
        {audioOn ? (
          <Volume2 style={{ width: 12, height: 12 }} />
        ) : (
          <VolumeX style={{ width: 12, height: 12 }} />
        )}
        {audioOn ? 'AUDIO ON' : 'AUDIO OFF'}
      </button>
    </div>
  );
}
