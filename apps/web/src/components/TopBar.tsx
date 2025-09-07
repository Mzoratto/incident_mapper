"use client";
import { useEffect, useState } from 'react';
import { syncNow } from '../sync/client';
import { db } from '../db/dexie';
import { apiFetch } from '../lib/api';
import { Database, RefreshCw, Radio, Users, ListTree } from 'lucide-react';

function Chip({ color, label, onClick, title, icon }: { color: string; label: string; onClick?: () => void; title?: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border bg-white shadow-sm hover:shadow transition text-sm ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function TopBar() {
  const [state, setState] = useState<'idle'|'pending'|'error'>('idle');
  const [last, setLast] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [online, setOnline] = useState(0);
  const [mode, setMode] = useState<'mock'|'db'|'offline'>('offline');

  async function refreshCursor() {
    const row = await db.kv.get('cursor');
    setCursor(row?.value || null);
  }

  useEffect(() => {
    refreshCursor();
    const onUpdated = () => { refreshCursor(); setLast(Date.now()); setState('idle'); };
    window.addEventListener('incidents-updated' as any, onUpdated);
    const onPresence = (e: any) => setOnline((e?.detail?.count) || 0);
    window.addEventListener('presence' as any, onPresence);
    // detect API and mode
    (async () => {
      try {
        const res = await apiFetch('/health');
        if (!res.ok) throw new Error('health');
        const j = await res.json();
        setMode(j?.mode === 'db' ? 'db' : 'mock');
      } catch {
        setMode('offline');
      }
    })();
    return () => { window.removeEventListener('incidents-updated' as any, onUpdated); window.removeEventListener('presence' as any, onPresence); };
  }, []);

  const triggerSync = async () => {
    setState('pending');
    const res = await syncNow();
    if (!res.ok) setState('error');
  };

  const toggleBG = () => {
    if (bgEnabled) { setBgEnabled(false); return; }
    navigator.serviceWorker?.ready.then(r => r.sync?.register('sync-ops').then(()=> setBgEnabled(true)).catch(()=> setBgEnabled(false)));
  };

  const statusColor = state === 'pending' ? 'bg-amber-500' : state === 'error' ? 'bg-red-600' : 'bg-emerald-600';
  const modeColor = mode === 'db' ? 'bg-emerald-600' : mode === 'mock' ? 'bg-blue-600' : 'bg-slate-500';
  const modeLabel = mode === 'db' ? 'DB' : mode === 'mock' ? 'Mock' : 'Offline';

  return (
    <div className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="app-container py-2 flex items-center gap-2 flex-wrap">
        <Chip color={modeColor} label={`DB: ${modeLabel}`} title="API mode (mock or database)" icon={<Database size={14} />} />
        <Chip color={statusColor} label={state === 'pending' ? 'Syncing…' : state === 'error' ? 'Error' : 'Idle'} onClick={triggerSync} title="Click to sync now" icon={<RefreshCw size={14} />} />
        <Chip color={bgEnabled ? 'bg-blue-600' : 'bg-slate-400'} label={bgEnabled ? 'BG sync on' : 'BG sync off'} onClick={toggleBG} title="Background Sync" icon={<Radio size={14} />} />
        <Chip color={'bg-purple-600'} label={`${online} online`} title="Presence" icon={<Users size={14} />} />
        <Chip color={'bg-slate-500'} label={cursor ? `Cursor ${String(cursor).slice(0,8)}…` : 'Cursor –'} title={cursor || undefined} icon={<ListTree size={14} />} />
        <div className="text-xs muted ml-auto">{last ? `Last sync ${new Date(last).toLocaleTimeString()}` : ''}</div>
      </div>
    </div>
  );
}
