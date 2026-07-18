import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9500,
            background: 'rgba(255,59,59,0.15)',
            border: '1px solid rgba(255,59,59,0.4)',
            borderRadius: 20, padding: '6px 14px',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}
        >
          <WifiOff style={{ width: 12, height: 12, color: '#ff3b3b' }} />
          <span style={{ fontSize: 10, color: '#ff3b3b', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
            OFFLINE MODE
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
