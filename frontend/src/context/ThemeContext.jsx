import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'deallens-theme';
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => window.localStorage.getItem(STORAGE_KEY) || 'system');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
      setResolvedTheme(theme);
      document.documentElement.dataset.theme = theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const value = useMemo(() => ({ preference, setPreference, resolvedTheme }), [preference, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
