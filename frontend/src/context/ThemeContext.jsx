import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('kv_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kv_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      }
    } catch (e) {
      console.warn('Theme state persist warning:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';
  const logoUrl = isDark ? '/assets/logo-dark.jpg' : '/assets/logo-light.jpg';
  const logoPngUrl = isDark ? '/assets/logo-dark.png' : '/assets/logo-light.png';
  const brandHeaderUrl = isDark ? '/assets/brand-header-dark.png' : '/assets/brand-header-light.png';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, logoUrl, logoPngUrl, brandHeaderUrl }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
      logoUrl: '/assets/logo-light.jpg',
      logoPngUrl: '/assets/logo-light.png',
      brandHeaderUrl: '/assets/brand-header-light.png'
    };
  }
  return ctx;
};

export default ThemeContext;

