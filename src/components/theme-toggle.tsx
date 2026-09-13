'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('zarsignal-theme', next);
    setTheme(next);
  }

  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تیره'} title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>;
}
