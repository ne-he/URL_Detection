import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '../../context/GamificationContext';
import { BADGE_INFO } from './gamificationLogic';

export function BadgeNotification() {
  const { newBadges, clearNewBadges } = useGamification();

  useEffect(() => {
    if (newBadges.length > 0) {
      const timer = setTimeout(clearNewBadges, 4000);
      return () => clearTimeout(timer);
    }
  }, [newBadges, clearNewBadges]);

  return (
    <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {newBadges.map(badgeId => {
          const info = BADGE_INFO[badgeId];
          return (
            <motion.div
              key={badgeId}
              initial={{ opacity: 0, x: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                background: 'rgba(8,14,14,0.95)',
                border: '1px solid var(--cyber-accent)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 0 20px rgba(0,255,157,0.3)',
                backdropFilter: 'blur(12px)',
                minWidth: 220,
              }}
            >
              <span style={{ fontSize: 22 }}>{info.icon}</span>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--cyber-accent)', margin: 0 }}>BADGE UNLOCKED</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyber-text)', margin: '2px 0 0 0' }}>{info.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(224,224,224,0.5)', margin: 0 }}>{info.description}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
