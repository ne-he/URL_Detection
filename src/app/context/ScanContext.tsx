import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ScanResult {
  label: 'PHISHING' | 'LEGITIMATE';
  confidence: number;
  legitimateChance: number;
  timestamp: number;
}

interface ScanState {
  isScanning: boolean;
  currentUrl: string;
  result: ScanResult | null;
}

interface ScanContextValue {
  scanState: ScanState;
  startScan: (url: string) => void;
  completeScan: (result: ScanResult) => void;
  resetScan: () => void;
  setCurrentUrl: (url: string) => void;
}

const defaultState: ScanState = {
  isScanning: false,
  currentUrl: '',
  result: null,
};

const ScanContext = createContext<ScanContextValue>({
  scanState: defaultState,
  startScan: () => {},
  completeScan: () => {},
  resetScan: () => {},
  setCurrentUrl: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanState, setScanState] = useState<ScanState>(defaultState);

  const startScan = useCallback((url: string) => {
    setScanState({ isScanning: true, currentUrl: url, result: null });
  }, []);

  const completeScan = useCallback((result: ScanResult) => {
    setScanState(prev => ({ ...prev, isScanning: false, result }));
  }, []);

  const resetScan = useCallback(() => {
    setScanState(defaultState);
  }, []);

  const setCurrentUrl = useCallback((url: string) => {
    setScanState(prev => ({ ...prev, currentUrl: url }));
  }, []);

  return (
    <ScanContext.Provider value={{ scanState, startScan, completeScan, resetScan, setCurrentUrl }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  return useContext(ScanContext);
}
