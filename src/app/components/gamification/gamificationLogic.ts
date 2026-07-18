export type BadgeId = 'first_scan' | 'scan_10' | 'scan_50' | 'first_phishing' | 'confidence_95' | 'first_qr';
export type Level = 'Script Kiddie' | 'White Hat' | 'Elite Hacker' | 'Neo';

export interface GamificationState {
  totalScans: number;
  phishingDetected: number;
  badges: BadgeId[];
  highestConfidence: number;
  qrScanned: boolean;
  personalBest: {
    maxSessionScans: number;
    highestConfidence: number;
  };
}

export const defaultGamificationState: GamificationState = {
  totalScans: 0,
  phishingDetected: 0,
  badges: [],
  highestConfidence: 0,
  qrScanned: false,
  personalBest: { maxSessionScans: 0, highestConfidence: 0 },
};

export function calculateLevel(totalScans: number): Level {
  if (totalScans >= 100) return 'Neo';
  if (totalScans >= 50) return 'Elite Hacker';
  if (totalScans >= 10) return 'White Hat';
  return 'Script Kiddie';
}

export function checkNewBadges(prev: GamificationState, next: GamificationState): BadgeId[] {
  const newBadges: BadgeId[] = [];
  if (next.totalScans >= 1 && !prev.badges.includes('first_scan') && !next.badges.includes('first_scan'))
    newBadges.push('first_scan');
  if (next.totalScans >= 10 && !prev.badges.includes('scan_10') && !next.badges.includes('scan_10'))
    newBadges.push('scan_10');
  if (next.totalScans >= 50 && !prev.badges.includes('scan_50') && !next.badges.includes('scan_50'))
    newBadges.push('scan_50');
  if (next.phishingDetected >= 1 && !prev.badges.includes('first_phishing') && !next.badges.includes('first_phishing'))
    newBadges.push('first_phishing');
  if (next.highestConfidence >= 95 && !prev.badges.includes('confidence_95') && !next.badges.includes('confidence_95'))
    newBadges.push('confidence_95');
  if (next.qrScanned && !prev.badges.includes('first_qr') && !next.badges.includes('first_qr'))
    newBadges.push('first_qr');
  return newBadges;
}

export const BADGE_INFO: Record<BadgeId, { name: string; description: string; icon: string }> = {
  first_scan: { name: 'First Blood', description: 'Scan pertama berhasil', icon: '🎯' },
  scan_10: { name: 'Rookie Hunter', description: '10 scan selesai', icon: '🔍' },
  scan_50: { name: 'Threat Analyst', description: '50 scan selesai', icon: '🛡️' },
  first_phishing: { name: 'Phish Catcher', description: 'Phishing pertama terdeteksi', icon: '🎣' },
  confidence_95: { name: 'Precision Strike', description: 'Confidence >95% terdeteksi', icon: '⚡' },
  first_qr: { name: 'QR Hunter', description: 'QR code pertama dipindai', icon: '📷' },
};

export function loadGamificationState(): GamificationState {
  try {
    const raw = localStorage.getItem('phishguard_gamification');
    if (!raw) return defaultGamificationState;
    const parsed = JSON.parse(raw) as GamificationState;
    if (typeof parsed.totalScans !== 'number') throw new Error('invalid');
    return { ...defaultGamificationState, ...parsed };
  } catch {
    return defaultGamificationState;
  }
}

export function saveGamificationState(state: GamificationState): void {
  try {
    localStorage.setItem('phishguard_gamification', JSON.stringify(state));
  } catch {
    // quota exceeded — fail silently
  }
}
