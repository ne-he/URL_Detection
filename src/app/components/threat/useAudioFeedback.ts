import { useCallback, useRef } from 'react';
import { Howl } from 'howler';

export function confidenceToPitch(confidence: number): number {
  if (confidence <= 30) return 0.5;
  if (confidence <= 70) return 1.0;
  return 2.0;
}

export function confidenceToColor(confidence: number): string {
  if (confidence <= 30) return '#00ff9d';
  if (confidence <= 70) return '#ffff00';
  return '#ff3b3b';
}

// Generate a short beep using Web Audio API as base64 WAV
function generateBeepDataUrl(frequency = 440, duration = 0.15): string {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 8);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0x7fff;
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(binary);
}

export function useAudioFeedback() {
  const howlRef = useRef<Howl | null>(null);

  const isAudioEnabled = (): boolean => {
    return localStorage.getItem('phishguard_audio_enabled') !== 'false';
  };

  const setAudioEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('phishguard_audio_enabled', String(enabled));
  }, []);

  const playBeep = useCallback((confidence: number) => {
    if (!isAudioEnabled()) return;
    try {
      const pitch = confidenceToPitch(confidence);
      const frequency = 440 * pitch;
      const src = generateBeepDataUrl(frequency);

      if (howlRef.current) howlRef.current.unload();
      howlRef.current = new Howl({
        src: [src],
        format: ['wav'],
        volume: 0.4,
        rate: pitch,
        onplayerror: () => {
          // Autoplay blocked — fail silently
        },
      });
      howlRef.current.play();
    } catch {
      // Audio not available — fail silently
    }
  }, []);

  return { playBeep, isAudioEnabled, setAudioEnabled };
}
