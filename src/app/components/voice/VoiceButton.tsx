import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoiceCommand, speakVerdict, isSpeechRecognitionSupported, type VoiceCommandResult } from './useVoiceCommand';
import { useScanContext } from '../../context/ScanContext';

interface VoiceButtonProps {
  onUrlDetected?: (url: string) => void;
  onShowHistory?: () => void;
}

export function VoiceButton({ onUrlDetected, onShowHistory }: VoiceButtonProps) {
  const [speechEnabled, setSpeechEnabled] = useState(
    () => localStorage.getItem('phishguard_speech_enabled') !== 'false'
  );
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const { setCurrentUrl } = useScanContext();
  const isSupported = isSpeechRecognitionSupported();

  const handleCommand = useCallback((result: VoiceCommandResult) => {
    setLastTranscript(result.transcript ?? null);
    switch (result.type) {
      case 'scan':
        if (result.url) {
          setCurrentUrl(result.url);
          onUrlDetected?.(result.url);
        }
        break;
      case 'history':
        onShowHistory?.();
        break;
      case 'phishing_info':
        // Show info in terminal or toast — handled by parent
        break;
    }
  }, [setCurrentUrl, onUrlDetected, onShowHistory]);

  const { isListening, error, startListening, stopListening } = useVoiceCommand({ onCommand: handleCommand });

  const toggleSpeech = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    localStorage.setItem('phishguard_speech_enabled', String(next));
  };

  // Suppress unused variable warning — lastTranscript is available for parent use via onCommand
  void lastTranscript;

  if (!isSupported) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Mic button */}
      <div style={{ position: 'relative' }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening ? stopListening : startListening}
          title={isListening ? 'Stop listening' : 'Start voice command'}
          aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
          style={{
            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
            background: isListening ? 'rgba(255,59,59,0.15)' : 'rgba(0,255,157,0.07)',
            border: `1px solid ${isListening ? 'rgba(255,59,59,0.5)' : 'rgba(0,255,157,0.22)'}`,
            color: isListening ? '#ff3b3b' : '#00ff9d',
            display: 'flex', alignItems: 'center',
            boxShadow: isListening ? '0 0 12px rgba(255,59,59,0.3)' : 'none',
          }}
        >
          {isListening
            ? <MicOff style={{ width: 16, height: 16 }} />
            : <Mic style={{ width: 16, height: 16 }} />
          }
        </motion.button>

        {/* Pulse animation when listening */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                position: 'absolute', inset: 0, borderRadius: 8,
                border: '2px solid #ff3b3b', pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Speech synthesis toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleSpeech}
        title={speechEnabled ? 'Disable speech output' : 'Enable speech output'}
        aria-label={speechEnabled ? 'Disable speech synthesis' : 'Enable speech synthesis'}
        style={{
          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(0,255,157,0.07)', border: '1px solid rgba(0,255,157,0.22)',
          color: speechEnabled ? '#00ff9d' : 'rgba(224,224,224,0.3)',
          display: 'flex', alignItems: 'center',
        }}
      >
        {speechEnabled
          ? <Volume2 style={{ width: 16, height: 16 }} />
          : <VolumeX style={{ width: 16, height: 16 }} />
        }
      </motion.button>

      {/* Waveform animation when listening */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ height: [4, 16, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                style={{ width: 3, background: '#ff3b3b', borderRadius: 2 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <span style={{ fontSize: 10, color: '#ff3b3b', fontFamily: 'monospace' }}>{error}</span>
      )}
    </div>
  );
}

// Export speakVerdict for use in LinkPredictor
export { speakVerdict };
