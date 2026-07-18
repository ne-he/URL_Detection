import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCommand, COMMAND_HELP } from './commandParser';
import { useScanContext } from '../../context/ScanContext';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeId } from '../theme/themeConfig';

interface TerminalLine {
  id: number;
  text: string;
  type: 'input' | 'output' | 'error' | 'system';
}

let lineCounter = 0;

export function TerminalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: lineCounter++, text: 'PhishGuard Terminal v2.0 — Type "help" for commands', type: 'system' },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { setCurrentUrl } = useScanContext();
  const { setTheme } = useTheme();

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  const addLine = useCallback((text: string, type: TerminalLine['type'] = 'output') => {
    setLines(prev => [...prev, { id: lineCounter++, text, type }]);
  }, []);

  const handleCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      addLine(`> ${trimmed}`, 'input');

      if (trimmed === 'help') {
        COMMAND_HELP.forEach(line => addLine(line));
        return;
      }

      const result = parseCommand(trimmed);

      switch (result.type) {
        case 'scan':
          setCurrentUrl(result.url);
          addLine(`Initiating scan for: ${result.url}`);
          addLine('Use the main interface to view results.');
          break;
        case 'history': {
          try {
            const history = JSON.parse(
              localStorage.getItem('phishguard_history') ?? '[]'
            ) as Array<{ url: string; label: string; confidence: number; timestamp: number }>;
            if (history.length === 0) {
              addLine('No scan history found.');
              break;
            }
            history.slice(0, 10).forEach((r, i) => {
              addLine(
                `${i + 1}. [${r.label}] ${r.url.slice(0, 50)}${r.url.length > 50 ? '...' : ''} (${r.confidence.toFixed(1)}%)`
              );
            });
          } catch {
            addLine('Error reading history.', 'error');
          }
          break;
        }
        case 'stats': {
          try {
            const history = JSON.parse(
              localStorage.getItem('phishguard_history') ?? '[]'
            ) as Array<{ label: string }>;
            const total = history.length;
            const phishing = history.filter(r => r.label === 'PHISHING').length;
            addLine(`Total scans: ${total}`);
            addLine(`Phishing detected: ${phishing}`);
            addLine(`Legitimate: ${total - phishing}`);
          } catch {
            addLine('Error reading stats.', 'error');
          }
          break;
        }
        case 'clear':
          setLines([{ id: lineCounter++, text: 'Terminal cleared.', type: 'system' }]);
          break;
        case 'theme':
          setTheme(result.themeName as ThemeId);
          addLine(`Theme changed to: ${result.themeName}`);
          break;
        case 'export': {
          try {
            const history = localStorage.getItem('phishguard_history') ?? '[]';
            const blob = new Blob([history], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'phishguard-history.json';
            a.click();
            URL.revokeObjectURL(url);
            addLine('History exported as phishguard-history.json');
          } catch {
            addLine('Export failed.', 'error');
          }
          break;
        }
        case 'error':
          addLine(result.message, 'error');
          break;
      }
    },
    [addLine, setCurrentUrl, setTheme]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':
        return 'var(--cyber-accent-2)';
      case 'error':
        return 'var(--cyber-danger)';
      case 'system':
        return 'rgba(224,224,224,0.4)';
      default:
        return 'var(--cyber-accent)';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 8000,
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* Terminal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 640,
              maxWidth: '90vw',
              zIndex: 8001,
              background: 'rgba(5,10,10,0.97)',
              border: '1px solid var(--cyber-accent)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 0 40px rgba(0,255,157,0.2)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(0,255,157,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  color: 'var(--cyber-accent)',
                  opacity: 0.7,
                }}
              >
                PHISHGUARD TERMINAL
              </span>
              <span style={{ fontSize: 10, color: 'rgba(224,224,224,0.3)' }}>Ctrl+K to toggle</span>
            </div>
            {/* Output */}
            <div
              ref={outputRef}
              style={{
                height: 280,
                overflowY: 'auto',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              {lines.map(line => (
                <div
                  key={line.id}
                  style={{ color: lineColor(line.type), lineHeight: 1.8, wordBreak: 'break-all' }}
                >
                  {line.text}
                </div>
              ))}
            </div>
            {/* Input */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(0,255,157,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: 'var(--cyber-accent)', fontFamily: 'monospace', fontSize: 13 }}>
                {'>'}
              </span>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--cyber-text)',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  caretColor: 'var(--cyber-accent)',
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
