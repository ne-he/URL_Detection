import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { HUDNav } from './HUDNav';

const hudVariants = {
  hidden: { x: -220, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { x: -220, opacity: 0, transition: { duration: 0.2 } },
};

export function HUDSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [supportsPointer, setSupportsPointer] = useState(true);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupportsPointer(typeof window.PointerEvent !== 'undefined');
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (e.clientX < 20) {
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
      setIsOpen(true);
    }
  }, []);

  const handlePanelLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 300);
  }, []);

  const handlePanelEnter = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <>
      {/* Fallback toggle button if no pointer events */}
      {!supportsPointer && (
        <button
          onClick={() => setIsOpen(v => !v)}
          aria-label="Toggle navigation"
          style={{
            position: 'fixed', top: 16, left: 16, zIndex: 200,
            background: 'rgba(0,255,157,0.1)', border: '1px solid var(--cyber-accent)',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--cyber-accent)',
          }}
        >
          <Menu style={{ width: 18, height: 18 }} />
        </button>
      )}

      {/* HUD Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="hud-panel"
            variants={hudVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 220, zIndex: 150,
            }}
            aria-label="Navigation HUD"
          >
            <HUDNav />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Edge trigger zone (invisible) */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 4, zIndex: 149 }}
      />
    </>
  );
}
