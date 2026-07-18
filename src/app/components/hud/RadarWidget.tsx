import { useScanContext } from '../../context/ScanContext';

export function RadarWidget() {
  const { scanState } = useScanContext();
  const isPhishing = scanState.result?.label === 'PHISHING';
  const isScanning = scanState.isScanning;

  return (
    <div
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
        width: 64, height: 64,
      }}
      title={isPhishing ? 'THREAT DETECTED' : isScanning ? 'SCANNING...' : 'MONITORING'}
    >
      <svg viewBox="0 0 64 64" width="64" height="64">
        {/* Concentric circles */}
        {[28, 20, 12].map(r => (
          <circle key={r} cx="32" cy="32" r={r} fill="none"
            stroke={isPhishing ? 'rgba(255,59,59,0.4)' : 'rgba(0,255,157,0.2)'}
            strokeWidth="1"
          />
        ))}
        {/* Rotating sweep line */}
        <line x1="32" y1="32" x2="32" y2="4"
          stroke={isPhishing ? '#ff3b3b' : 'var(--cyber-accent)'}
          strokeWidth="1.5"
          style={{
            transformOrigin: '32px 32px',
            animation: `radar-spin ${isScanning ? '0.8s' : '3s'} linear infinite`,
            filter: `drop-shadow(0 0 3px ${isPhishing ? '#ff3b3b' : 'var(--cyber-accent)'})`,
          }}
        />
        {/* Center dot */}
        <circle cx="32" cy="32" r="2.5"
          fill={isPhishing ? '#ff3b3b' : 'var(--cyber-accent)'}
          style={isPhishing ? { animation: 'radar-pulse 0.8s ease-in-out infinite' } : undefined}
        />
        {/* Phishing threat dot */}
        {isPhishing && (
          <circle cx="32" cy="14" r="3"
            fill="#ff3b3b"
            style={{ animation: 'radar-pulse 0.8s ease-in-out infinite' }}
          />
        )}
      </svg>
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0%, 100% { opacity: 0.4; r: 2.5; }
          50% { opacity: 1; r: 4; }
        }
      `}</style>
    </div>
  );
}
