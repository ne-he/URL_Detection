import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9000,
            background: 'rgba(5,10,10,0.97)',
            border: '1px solid var(--cyber-accent)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 0 20px rgba(0,255,157,0.2)',
            backdropFilter: 'blur(12px)',
            maxWidth: 300,
          }}
        >
          <Download style={{ width: 18, height: 18, color: 'var(--cyber-accent)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--cyber-text)', margin: 0 }}>
              Instal PhishGuard
            </p>
            <p style={{ fontSize: 10, color: 'rgba(224,224,224,0.5)', margin: '2px 0 0 0' }}>
              Instal sebagai aplikasi
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleInstall}
              style={{
                padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                background: 'var(--cyber-accent)', border: 'none',
                color: '#0a0f0f', fontSize: 11, fontWeight: 700,
              }}
            >
              Install
            </button>
            <button
              onClick={() => setIsVisible(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,224,224,0.4)' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
