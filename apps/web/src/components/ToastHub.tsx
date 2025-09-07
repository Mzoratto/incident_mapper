"use client";
import { useEffect, useRef, useState } from 'react';

export function ToastHub() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function show(message: string) {
      setMsg(message);
      setOpen(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(false), 2500);
    }
    const onUpdated = () => show('Incidents updated');
    const onToast = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const m = (ce.detail && ce.detail.message) || 'Action complete';
        show(String(m));
      } catch { show('Action complete'); }
    };
    window.addEventListener('incidents-updated' as any, onUpdated);
    window.addEventListener('toast' as any, onToast);
    return () => {
      window.removeEventListener('incidents-updated' as any, onUpdated);
      window.removeEventListener('toast' as any, onToast);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end p-4">
      <div
        className={`transform transition-all duration-200 ${open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="pointer-events-auto rounded-md bg-slate-900 text-white shadow-lg px-3 py-2 text-sm min-w-[200px]">
          {msg}
        </div>
      </div>
    </div>
  );
}
