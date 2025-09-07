"use client";
import { useEffect, useState } from 'react';
import { syncNow } from '../sync/client';

export function SyncIndicator() {
  const [state, setState] = useState<'idle'|'pending'|'error'>('idle');
  const [last, setLast] = useState<number | null>(null);

  useEffect(() => {
    const onOnline = () => setState('idle');
    const onOffline = () => setState('error');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const runSync = async () => {
    setState('pending');
    try {
      const res = await syncNow();
      if (!res.ok) throw new Error(res.error || 'sync failed');
      setLast(Date.now());
      setState('idle');
    } catch {
      setState('error');
    }
  };

  const color = state === 'pending' ? 'bg-amber-500' : state === 'error' ? 'bg-red-600' : 'bg-emerald-600';
  const label = state === 'pending' ? 'Syncing…' : state === 'error' ? 'Offline' : 'Idle';
  return (
    <div className={`inline-flex items-center gap-3 text-sm`}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`}></span>
      <span>{label}</span>
      <button onClick={runSync} className="underline disabled:opacity-60" disabled={state==='pending'}>
        Sync now
      </button>
      <button onClick={() => navigator.serviceWorker?.ready.then(r=>r.sync?.register('sync-ops'))} className="underline">
        Enable BG sync
      </button>
      {last && <span className="text-slate-500">{new Date(last).toLocaleTimeString()}</span>}
    </div>
  );
}
