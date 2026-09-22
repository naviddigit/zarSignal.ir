'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
const options = [
  { value: 'system', label: 'سیستم', Icon: Laptop },
  { value: 'light', label: 'روشن', Icon: Sun },
  { value: 'dark', label: 'تیره', Icon: Moon },
] as const;

function applyTheme(preference: ThemePreference) {
  const resolved = preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    meta.content = resolved === 'dark' ? '#080c13' : '#f5f7fa';
  });
}

export function ThemeToggle() {
  // The first client render must match SSR, even with a saved preference.
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    const initial = document.documentElement.dataset.themePreference;
    setPreference(initial === 'light' || initial === 'dark' ? initial : 'system');
  }, []);
  useEffect(() => {
    applyTheme(preference);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { if (preference === 'system') applyTheme('system'); };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  function choose(value: ThemePreference) {
    try {
      if (value === 'system') localStorage.removeItem('zarsignal-theme');
      else localStorage.setItem('zarsignal-theme', value);
    } catch { /* Theme selection still works when browser storage is unavailable. */ }
    setPreference(value);
    applyTheme(value);
  }

  return <div className="theme-selector" role="group" aria-label="انتخاب حالت نمایش">
    {options.map(({ value, label, Icon }) => <button
      key={value} type="button" className="theme-option" data-active={preference === value}
      aria-label={label} aria-pressed={preference === value} onClick={() => choose(value)} title={`حالت ${label}`}
    ><Icon size={14}/><span>{label}</span></button>)}
  </div>;
}
