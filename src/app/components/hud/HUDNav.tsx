import { Link, useLocation } from 'react-router';
import { Home, Info, Shield } from 'lucide-react';
import { ThemePicker } from '../theme/ThemePicker';
import { GamificationWidget } from '../gamification/GamificationWidget';
import { ThreatBoard } from '../collaboration/ThreatBoard';

const STATUS_LINES = ['> KERNEL ACTIVE', '> ENCRYPTION OK', '> MODEL READY'];

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/about', label: 'About Us', icon: Info },
];

export function HUDNav() {
  const location = useLocation();

  return (
    <div style={{
      width: 220, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(5,10,10,0.95)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--cyber-border-color)',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(0,255,157,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.35)',
            boxShadow: '0 0 12px rgba(0,255,157,0.2)',
          }}>
            <Shield style={{ width: 18, height: 18, color: 'var(--cyber-accent)' }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--cyber-accent)', textShadow: '0 0 10px var(--cyber-accent)', textTransform: 'uppercase', margin: 0 }}>
              PhishGuard
            </p>
            <p style={{ fontSize: 10, color: 'rgba(224,224,224,0.35)', letterSpacing: '0.1em', margin: 0 }}>v2.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(0,255,157,0.4)', marginBottom: 10, paddingLeft: 8 }}>
          NAVIGATION
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
                    transition: 'all 0.2s',
                    ...(isActive ? {
                      background: 'rgba(0,255,157,0.1)',
                      border: '1px solid rgba(0,255,157,0.3)',
                      color: 'var(--cyber-accent)',
                      textShadow: '0 0 6px var(--cyber-accent)',
                      boxShadow: '0 0 14px rgba(0,255,157,0.12)',
                    } : {
                      border: '1px solid transparent',
                      color: 'rgba(224,224,224,0.55)',
                    }),
                  }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.05em' }}>{item.label}</span>
                  {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--cyber-accent)', boxShadow: '0 0 8px var(--cyber-accent)' }} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        <div style={{ borderTop: '1px solid rgba(0,255,157,0.1)', paddingTop: 12 }}>
          <GamificationWidget />
        </div>
        <div style={{ borderTop: '1px solid rgba(0,255,157,0.1)', paddingTop: 12 }}>
          <ThreatBoard />
        </div>
        <div style={{ borderTop: '1px solid rgba(0,255,157,0.1)', paddingTop: 12 }}>
          <ThemePicker />
        </div>
      </div>

      {/* Status terminal */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(0,255,157,0.1)' }}>
        {STATUS_LINES.map(line => (
          <p key={line} style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,255,157,0.5)', margin: '2px 0', letterSpacing: '0.05em' }}>
            {line}
          </p>
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--cyber-accent)', boxShadow: '0 0 6px var(--cyber-accent)',
              animation: `pulse-dot 1.5s ease-in-out ${i * 0.3}s infinite`,
              display: 'inline-block',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
