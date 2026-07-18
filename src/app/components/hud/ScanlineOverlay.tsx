import { useEffect } from 'react';
import { useScanContext } from '../../context/ScanContext';

export function ScanlineOverlay() {
  const { scanState } = useScanContext();

  useEffect(() => {
    const opacity = scanState.isScanning ? '0.08' : '0.03';
    document.documentElement.style.setProperty('--scanline-opacity', opacity);
  }, [scanState.isScanning]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,var(--scanline-opacity, 0.03)) 2px, rgba(0,0,0,var(--scanline-opacity, 0.03)) 4px)',
        transition: 'opacity 0.5s ease',
      }}
    />
  );
}
