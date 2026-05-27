import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  GamificationState, BadgeId, defaultGamificationState,
  loadGamificationState, saveGamificationState,
  calculateLevel, checkNewBadges, type Level
} from '../components/gamification/gamificationLogic';

interface RecordScanInput {
  label: 'PHISHING' | 'LEGITIMATE';
  confidence: number;
  isQr?: boolean;
}

interface GamificationContextValue {
  gamState: GamificationState;
  currentLevel: Level;
  newBadges: BadgeId[];
  clearNewBadges: () => void;
  recordScan: (input: RecordScanInput) => void;
  recordQrScan: () => void;
}

const GamificationContext = createContext<GamificationContextValue>({
  gamState: defaultGamificationState,
  currentLevel: 'Script Kiddie',
  newBadges: [],
  clearNewBadges: () => {},
  recordScan: () => {},
  recordQrScan: () => {},
});

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [gamState, setGamState] = useState<GamificationState>(loadGamificationState);
  const [newBadges, setNewBadges] = useState<BadgeId[]>([]);
  const sessionScans = useRef(0);

  const recordScan = useCallback((input: RecordScanInput) => {
    sessionScans.current += 1;
    setGamState(prev => {
      const next: GamificationState = {
        ...prev,
        totalScans: prev.totalScans + 1,
        phishingDetected: input.label === 'PHISHING' ? prev.phishingDetected + 1 : prev.phishingDetected,
        highestConfidence: Math.max(prev.highestConfidence, input.confidence),
        personalBest: {
          maxSessionScans: Math.max(prev.personalBest.maxSessionScans, sessionScans.current),
          highestConfidence: Math.max(prev.personalBest.highestConfidence, input.confidence),
        },
      };
      const earned = checkNewBadges(prev, next);
      if (earned.length > 0) {
        next.badges = [...prev.badges, ...earned];
        setNewBadges(b => [...b, ...earned]);
      }
      // Confetti for high-confidence phishing
      if (input.label === 'PHISHING' && input.confidence > 95) {
        confetti({
          particleCount: 80,
          spread: 70,
          colors: ['#00ff9d', '#00ffff', '#ffffff'],
          origin: { y: 0.6 },
        });
      }
      saveGamificationState(next);
      return next;
    });
  }, []);

  const recordQrScan = useCallback(() => {
    setGamState(prev => {
      if (prev.qrScanned) return prev;
      const next = { ...prev, qrScanned: true };
      const earned = checkNewBadges(prev, next);
      if (earned.length > 0) {
        next.badges = [...prev.badges, ...earned];
        setNewBadges(b => [...b, ...earned]);
      }
      saveGamificationState(next);
      return next;
    });
  }, []);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);
  const currentLevel = calculateLevel(gamState.totalScans);

  return (
    <GamificationContext.Provider value={{ gamState, currentLevel, newBadges, clearNewBadges, recordScan, recordQrScan }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  return useContext(GamificationContext);
}
