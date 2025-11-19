import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import type { Theme } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedAuth = localStorage.getItem('focusBuddyAuth');
    if (savedAuth) {
      setIsAuthenticated(JSON.parse(savedAuth));
    }
    const savedTheme = localStorage.getItem('focusBuddyTheme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => { 
    localStorage.setItem('focusBuddyAuth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);
  
  useEffect(() => {
    localStorage.setItem('focusBuddyTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} theme={theme} />;
  }

  return <MainLayout theme={theme} setTheme={setTheme} onLogout={() => setIsAuthenticated(false)} />;
};

export default App;