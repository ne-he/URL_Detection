import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface ToastNotificationProps {
  message: string | null;
  onDone: () => void;
  duration?: number;
}

export function ToastNotification({ message, onDone, duration = 1500 }: ToastNotificationProps) {
  const shouldReduceMotion = useReducedMotion();
  const animDuration = shouldReduceMotion ? 0 : 0.15;

  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDone]);

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9998 }}>
      <AnimatePresence>
        {message !== null && (
          <motion.div
            key="toast"
            drag={shouldReduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 300 }}
            onDragEnd={(_, info) => { if (info.offset.x > 100) onDone(); }}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : 120 }}
            transition={{ duration: animDuration }}
            style={{ cursor: "grab",
              background: "rgba(8,14,14,0.95)",
              border: "1px solid rgba(0,255,157,0.4)",
              borderRadius: 8,
              padding: "10px 18px",
              color: "#00ff9d",
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.15em",
              boxShadow: "0 0 16px rgba(0,255,157,0.2)",
            }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
