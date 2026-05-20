import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'dark' | 'light';
export type Motion = 'strong' | 'weak';

type PreferencesContextValue = {
  theme: Theme;
  motion: Motion;
  setTheme: (t: Theme) => void;
  setMotion: (m: Motion) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('pref_theme') as Theme | null) ?? 'dark',
  );
  const [motion, setMotionState] = useState<Motion>(
    () => (localStorage.getItem('pref_motion') as Motion | null) ?? 'strong',
  );

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('pref_theme', t);
  };

  const setMotion = (m: Motion) => {
    setMotionState(m);
    localStorage.setItem('pref_motion', m);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', motion === 'weak');
  }, [motion]);

  return (
    <PreferencesContext.Provider value={{ theme, motion, setTheme, setMotion }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
