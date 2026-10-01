'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
const options = [
  { value: 'system', label: 'سیستم', Icon: Laptop },
  { value: 'light', label: 'روشن', Icon: Sun },
  { value: 'dark', label: 'تیره', Icon: Moon },
] as const;

function applyTheme(preference: ThemePreference, animate: boolean) {
  const resolved = preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference;
  const root = document.documentElement;
  if (animate) {
    root.classList.add('is-theme-switching');
    window.setTimeout(() => root.classList.remove('is-theme-switching'), 320);
  }
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    meta.content = resolved === 'dark' ? '#080c13' : '#f5f7fa';
  });
}

export function ThemeToggle() {
  // Match SSR first paint; preference syncs after mount without re-painting theme.
  const [preference, setPreference] = useState<ThemePreference>('system');
  const ready = useRef(false);

  useEffect(() => {
    let initial: ThemePreference = 'system';
    try {
      const stored = localStorage.getItem('zarsignal-theme');
      if (stored === 'light' || stored === 'dark') initial = stored;
    } catch { /* optional storage */ }
    setPreference(initial);
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      if (preference === 'system') applyTheme('system', false);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  function choose(value: ThemePreference) {
    try {
      if (value === 'system') localStorage.removeItem('zarsignal-theme');
      else localStorage.setItem('zarsignal-theme', value);
    } catch { /* Theme selection still works without storage. */ }
    setPreference(value);
    applyTheme(value, true);
  }

  return (
    <div className="theme-selector" role="group" aria-label="انتخاب حالت نمایش">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className="theme-option"
          data-active={preference === value}
          aria-label={label}
          aria-pressed={preference === value}
          onClick={() => choose(value)}
          title={`حالت ${label}`}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
