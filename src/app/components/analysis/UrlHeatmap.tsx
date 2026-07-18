import { useState } from 'react';
import { getCharacterRiskScores } from './featureExtractor';

interface UrlHeatmapProps {
  url: string;
}

function riskToColor(risk: number): string {
  // 0.0 = green, 1.0 = red
  const r = Math.round(risk * 255);
  const g = Math.round((1 - risk) * 200);
  return `rgb(${r}, ${g}, 50)`;
}

export function UrlHeatmap({ url }: UrlHeatmapProps) {
  const [showFull, setShowFull] = useState(false);
  const MAX_DISPLAY = 200;
  const isTruncated = url.length > MAX_DISPLAY;
  const displayUrl = isTruncated && !showFull ? url.slice(0, MAX_DISPLAY) : url;
  const scores = getCharacterRiskScores(url);

  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(224,224,224,0.4)', marginBottom: 8 }}>
        URL HEATMAP
      </p>
      <div style={{
        fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8,
        wordBreak: 'break-all', padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)', borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {displayUrl.split('').map((char, i) => (
          <span
            key={i}
            title={`Risk: ${(scores[i] * 100).toFixed(0)}%`}
            style={{
              color: riskToColor(scores[i]),
              textShadow: scores[i] > 0.7 ? `0 0 4px ${riskToColor(scores[i])}` : 'none',
            }}
          >
            {char}
          </span>
        ))}
        {isTruncated && !showFull && (
          <button
            onClick={() => setShowFull(true)}
            title={url}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--cyber-accent-2)', fontSize: 11, fontFamily: 'monospace',
            }}
          >
            ...({url.length - MAX_DISPLAY} more)
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 9, color: 'rgba(224,224,224,0.4)' }}>
        <span style={{ color: '#00c850' }}>■ Low risk</span>
        <span style={{ color: '#ffaa00' }}>■ Medium risk</span>
        <span style={{ color: '#ff3b3b' }}>■ High risk</span>
      </div>
    </div>
  );
}
