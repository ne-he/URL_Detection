import { useTheme } from '../../context/ThemeContext';
import { THEMES } from './themeConfig';
import { motion } from 'framer-motion';

export function ThemePicker() {
  const { currentTheme, setTheme } = useTheme();
  return (
    <div style={{ padding: '12px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyber-accent)', marginBottom: 10, opacity: 0.7 }}>
        ▶ THEME
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {THEMES.map(theme => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(theme.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
              background: currentTheme === theme.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${currentTheme === theme.id ? theme.vars['--cyber-accent'] : 'transparent'}`,
              color: 'var(--cyber-text)', fontSize: 11,
              boxShadow: currentTheme === theme.id ? `0 0 8px ${theme.vars['--cyber-accent']}40` : 'none',
            }}
          >
            <div style={{ display: 'flex', gap: 3 }}>
              {[theme.vars['--cyber-accent'], theme.vars['--cyber-accent-2'], theme.vars['--cyber-danger']].map((c, i) => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}` }} />
              ))}
            </div>
            <span style={{ letterSpacing: '0.05em' }}>{theme.name}</span>
            {currentTheme === theme.id && (
              <span style={{ marginLeft: 'auto', color: theme.vars['--cyber-accent'], fontSize: 10 }}>●</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
