"use client";
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const ls = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefers = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = ls ? ls === 'dark' : prefers;
    setDark(initial);
    if (initial) document.documentElement.classList.add('dark');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button onClick={toggle} className="text-sm underline">
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

