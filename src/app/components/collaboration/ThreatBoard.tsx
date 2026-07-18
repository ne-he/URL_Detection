import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { useCollaboration } from './useCollaboration';
import { useScanContext } from '../../context/ScanContext';

export function ThreatBoard() {
  const { entries, isOffline, currentUserId } = useCollaboration();
  const { setCurrentUrl } = useScanContext();
  const prevCountRef = useRef(0);

  // Track new entries for notification effect
  useEffect(() => {
    prevCountRef.current = entries.length;
  }, [entries.length]);

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyber-accent)', margin: 0, opacity: 0.7 }}>
          ▶ THREAT BOARD
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isOffline
            ? <WifiOff style={{ width: 10, height: 10, color: 'rgba(224,224,224,0.3)' }} />
            : <Wifi style={{ width: 10, height: 10, color: 'var(--cyber-accent)' }} />
          }
          <span style={{ fontSize: 8, color: isOffline ? 'rgba(224,224,224,0.3)' : 'var(--cyber-accent)', letterSpacing: '0.1em' }}>
            {isOffline ? 'SIM' : 'LIVE'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <p style={{ fontSize: 10, color: 'rgba(224,224,224,0.25)', fontFamily: 'monospace', textAlign: 'center', padding: '8px 0' }}>
              Monitoring...
            </p>
          ) : (
            entries.map(entry => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onClick={() => setCurrentUrl(entry.url)}
                title={`Click to analyze: ${entry.url}`}
                style={{
                  background: 'rgba(255,59,59,0.06)',
                  border: '1px solid rgba(255,59,59,0.2)',
                  borderRadius: 6, padding: '6px 8px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Radio style={{ width: 8, height: 8, color: '#ff3b3b', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: 'rgba(224,224,224,0.4)', fontFamily: 'monospace' }}>
                    {entry.userId}
                  </span>
                </div>
                <p style={{
                  fontSize: 9, color: '#ff3b3b', fontFamily: 'monospace',
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.url.length > 35 ? entry.url.slice(0, 35) + '...' : entry.url}
                </p>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>

      <p style={{ fontSize: 8, color: 'rgba(224,224,224,0.2)', marginTop: 6, fontFamily: 'monospace', textAlign: 'center' }}>
        ID: {currentUserId}
      </p>
    </div>
  );
}
