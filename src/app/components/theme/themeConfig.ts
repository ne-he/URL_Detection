interface ThemeConfig {
  id: 'neon-noir' | 'crimson-dawn' | 'arctic-hack';
  name: string;
  vars: Record<string, string>;
  threeAccentColor: string;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'neon-noir',
    name: 'Neon Noir',
    vars: {
      '--cyber-accent': '#00ff9d',
      '--cyber-accent-2': '#00ffff',
      '--cyber-danger': '#ff3b3b',
      '--cyber-bg': '#0a0f0f',
      '--cyber-text': '#e0e0e0',
      '--cyber-surface': 'rgba(8,14,14,0.88)',
      '--cyber-border-color': 'rgba(0,255,157,0.18)',
    },
    threeAccentColor: '#00ff9d',
  },
  {
    id: 'crimson-dawn',
    name: 'Crimson Dawn',
    vars: {
      '--cyber-accent': '#ff3b3b',
      '--cyber-accent-2': '#ff6b6b',
      '--cyber-danger': '#ff0000',
      '--cyber-bg': '#0f0a0a',
      '--cyber-text': '#f0d0d0',
      '--cyber-surface': 'rgba(14,8,8,0.88)',
      '--cyber-border-color': 'rgba(255,59,59,0.18)',
    },
    threeAccentColor: '#ff3b3b',
  },
  {
    id: 'arctic-hack',
    name: 'Arctic Hack',
    vars: {
      '--cyber-accent': '#00bfff',
      '--cyber-accent-2': '#87ceeb',
      '--cyber-danger': '#ff6b35',
      '--cyber-bg': '#080d14',
      '--cyber-text': '#e8f4f8',
      '--cyber-surface': 'rgba(8,13,20,0.88)',
      '--cyber-border-color': 'rgba(0,191,255,0.18)',
    },
    threeAccentColor: '#00bfff',
  },
];

export type ThemeId = 'neon-noir' | 'crimson-dawn' | 'arctic-hack';

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('phishguard_theme', themeId);
}

export function loadTheme(): ThemeId {
  const saved = localStorage.getItem('phishguard_theme') as ThemeId | null;
  const valid: ThemeId[] = ['neon-noir', 'crimson-dawn', 'arctic-hack'];
  return valid.includes(saved as ThemeId) ? (saved as ThemeId) : 'neon-noir';
}

export { THEMES };
export type { ThemeConfig };
