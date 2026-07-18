import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';

interface ThreatPoint {
  lat: number;
  lng: number;
  urls: string[];
  country: string;
}

interface ThreatPointModalProps {
  point: ThreatPoint | null;
  onClose: () => void;
}

export function ThreatPointModal({ point, onClose }: ThreatPointModalProps) {
  return (
    <AnimatePresence>
      {point && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8500 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
              width: 320, zIndex: 8501,
              background: 'rgba(5,10,10,0.97)', border: '1px solid var(--cyber-danger)',
              borderRadius: 12, padding: 20,
              boxShadow: '0 0 30px rgba(255,59,59,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin style={{ width: 14, height: 14, color: '#ff3b3b' }} />
                <span style={{ fontSize: 11, letterSpacing: '0.15em', color: '#ff3b3b' }}>THREAT LOCATION</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,224,224,0.5)' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--cyber-text)', marginBottom: 12 }}>{point.country}</p>
            <p style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(224,224,224,0.4)', marginBottom: 8 }}>
              {point.urls.length} URL(s) detected
            </p>
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              {point.urls.map((url, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,59,59,0.1)' }}>
                  <p style={{ fontSize: 9, color: '#ff3b3b', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
                    {url}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
