import { useGamification } from '../../context/GamificationContext';
import { BADGE_INFO } from './gamificationLogic';

const LEVEL_COLORS: Record<string, string> = {
  'Script Kiddie': '#888',
  'White Hat': '#00ff9d',
  'Elite Hacker': '#00ffff',
  'Neo': '#ff00ff',
};

const LEVEL_THRESHOLDS = [
  { level: 'Script Kiddie', min: 0, max: 9 },
  { level: 'White Hat', min: 10, max: 49 },
  { level: 'Elite Hacker', min: 50, max: 99 },
  { level: 'Neo', min: 100, max: 200 },
];

export function GamificationWidget() {
  const { gamState, currentLevel } = useGamification();
  const levelColor = LEVEL_COLORS[currentLevel] ?? '#00ff9d';
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)!;
  const progress = Math.min(((gamState.totalScans - threshold.min) / (threshold.max - threshold.min + 1)) * 100, 100);

  return (
    <div style={{ padding: '12px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyber-accent)', marginBottom: 10, opacity: 0.7 }}>
        ▶ OPERATOR STATUS
      </p>
      {/* Level */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: levelColor, textShadow: `0 0 8px ${levelColor}` }}>
            {currentLevel}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(224,224,224,0.4)' }}>{gamState.totalScans} scans</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: levelColor, boxShadow: `0 0 6px ${levelColor}`, transition: 'width 0.5s ease' }} />
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'rgba(255,59,59,0.08)', borderRadius: 6, border: '1px solid rgba(255,59,59,0.2)' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#ff3b3b', margin: 0 }}>{gamState.phishingDetected}</p>
          <p style={{ fontSize: 9, color: 'rgba(224,224,224,0.4)', margin: 0, letterSpacing: '0.1em' }}>THREATS</p>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'rgba(0,255,157,0.08)', borderRadius: 6, border: '1px solid rgba(0,255,157,0.2)' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#00ff9d', margin: 0 }}>{gamState.personalBest.highestConfidence.toFixed(0)}%</p>
          <p style={{ fontSize: 9, color: 'rgba(224,224,224,0.4)', margin: 0, letterSpacing: '0.1em' }}>BEST</p>
        </div>
      </div>
      {/* Badges */}
      {gamState.badges.length > 0 && (
        <div>
          <p style={{ fontSize: 9, letterSpacing: '0.15em', color: 'rgba(224,224,224,0.3)', marginBottom: 6 }}>BADGES</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {gamState.badges.map(id => (
              <span key={id} title={BADGE_INFO[id].name} style={{ fontSize: 16, cursor: 'default' }}>
                {BADGE_INFO[id].icon}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
