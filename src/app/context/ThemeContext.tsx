import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, loadTheme, THEMES, type ThemeId } from '../components/theme/themeConfig';

interface ThemeContextValue {
  currentTheme: ThemeId;
  setTheme: (id: ThemeId) => void;
  threeAccentColor: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: 'neon-noir',
  setTheme: () => {},
  threeAccentColor: '#00ff9d',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(loadTheme);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (id: ThemeId) => {
    setCurrentTheme(id);
    applyTheme(id);
  };

  const threeAccentColor = THEMES.find(t => t.id === currentTheme)?.threeAccentColor ?? '#00ff9d';

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, threeAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
