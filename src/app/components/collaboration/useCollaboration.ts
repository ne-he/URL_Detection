import { useState, useEffect, useRef, useCallback } from 'react';

export interface CollabEntry {
  id: string;
  userId: string;
  url: string;
  label: 'PHISHING' | 'LEGITIMATE';
  timestamp: number;
}

const MOCK_PHISHING_URLS = [
  'http://secure-login-verify.com/account/update',
  'http://paypal-update.phishing.net/verify',
  'http://192.168.1.1/bank-login',
  'http://amazon-security-alert.com/signin',
  'http://apple-id-verify.suspicious.net/login',
  'http://netflix-billing-update.phish.com/account',
  'http://google-security-check.fake.com/verify',
  'http://microsoft-account-alert.net/password',
  'http://facebook-login-secure.phishing.org/auth',
  'http://instagram-verify-account.net/confirm',
  'http://bank-of-america-secure.phish.net/login',
  'http://chase-bank-alert.suspicious.com/verify',
  'http://wells-fargo-update.phishing.net/account',
  'http://citibank-security.fake.com/signin',
  'http://ebay-account-suspended.phish.org/verify',
  'http://dropbox-share-link.suspicious.net/file',
  'http://linkedin-security-alert.phish.com/login',
  'http://twitter-verify-account.fake.net/confirm',
  'http://whatsapp-web-login.suspicious.com/auth',
  'http://steam-trade-offer.phishing.net/confirm',
  'http://crypto-wallet-verify.fake.com/login',
  'http://irs-tax-refund.suspicious.net/claim',
];

function generateUserId(): string {
  return `User_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function generateEntryId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useCollaboration(wsUrl?: string) {
  const [entries, setEntries] = useState<CollabEntry[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const userId = useRef(generateUserId());
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addEntry = useCallback((entry: CollabEntry) => {
    setEntries(prev => [entry, ...prev].slice(0, 10));
  }, []);

  const scheduleSimulation = useCallback(() => {
    const delay = 5000 + Math.random() * 10000; // 5–15 seconds
    simRef.current = setTimeout(() => {
      const mockUrl = MOCK_PHISHING_URLS[Math.floor(Math.random() * MOCK_PHISHING_URLS.length)];
      addEntry({
        id: generateEntryId(),
        userId: generateUserId(),
        url: mockUrl,
        label: 'PHISHING',
        timestamp: Date.now(),
      });
      scheduleSimulation(); // schedule next
    }, delay);
  }, [addEntry]);

  useEffect(() => {
    if (wsUrl) {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data) as CollabEntry;
            addEntry(data);
          } catch { /* ignore malformed */ }
        };
        ws.onerror = () => {
          setIsOffline(true);
          scheduleSimulation();
        };
        ws.onclose = () => {
          setIsOffline(true);
          scheduleSimulation();
        };
      } catch {
        setIsOffline(true);
        scheduleSimulation();
      }
    } else {
      setIsOffline(true);
      scheduleSimulation();
    }

    return () => {
      wsRef.current?.close();
      if (simRef.current) clearTimeout(simRef.current);
    };
  }, [wsUrl, scheduleSimulation, addEntry]);

  const broadcastScan = useCallback((url: string, label: 'PHISHING' | 'LEGITIMATE') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        id: generateEntryId(),
        userId: userId.current,
        url,
        label,
        timestamp: Date.now(),
      }));
    }
  }, []);

  return { entries, isOffline, currentUserId: userId.current, broadcastScan };
}
