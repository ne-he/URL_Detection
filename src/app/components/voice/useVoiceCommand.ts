import { useState, useRef, useCallback } from 'react';

export interface VoiceCommandResult {
  type: 'scan' | 'history' | 'phishing_info' | 'unknown';
  url?: string;
  transcript?: string;
}

export function parseVoiceInput(transcript: string): VoiceCommandResult {
  const lower = transcript.toLowerCase().trim();

  // Scan command
  if (lower.includes('scan') || lower.includes('pindai') || lower.includes('analisis')) {
    const urlMatch = transcript.match(/https?:\/\/\S+/);
    return { type: 'scan', url: urlMatch?.[0], transcript };
  }

  // History command
  if (lower.includes('riwayat') || lower.includes('history') || lower.includes('histori')) {
    return { type: 'history', transcript };
  }

  // Phishing info
  if (lower.includes('phishing') || lower.includes('apa itu') || lower.includes('what is')) {
    return { type: 'phishing_info', transcript };
  }

  return { type: 'unknown', transcript };
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakVerdict(label: string, confidence: number, enabled: boolean): void {
  if (!enabled || !isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const text = label === 'PHISHING'
      ? `Warning. Phishing detected. Confidence ${confidence.toFixed(0)} percent. This URL is dangerous.`
      : `Safe. Legitimate URL detected. Confidence ${confidence.toFixed(0)} percent.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.8;
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis not available — fail silently
  }
}

interface UseVoiceCommandOptions {
  onCommand: (result: VoiceCommandResult) => void;
}

// Web Speech API types (not in default TypeScript lib)
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useVoiceCommand({ onCommand }: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Browser tidak mendukung fitur suara');
      return;
    }

    try {
      const win = window as WindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition ?? win.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) return;

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setError('Akses mikrofon ditolak');
        } else if (e.error === 'no-speech') {
          setError(null); // normal timeout
        } else {
          setError(`Error: ${e.error}`);
        }
      };
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        const result = parseVoiceInput(transcript);
        onCommand(result);
        setError(null);
      };

      recognition.start();
    } catch {
      setError('Gagal memulai pengenalan suara');
      setIsListening(false);
    }
  }, [isSupported, onCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, error, isSupported, startListening, stopListening };
}
