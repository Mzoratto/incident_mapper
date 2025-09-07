"use client";
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { db } from '../db/dexie';

type Incident = { id: string; title: string; status: string; updatedAt?: string };

export function IncidentList() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch('/v1/incidents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Incident[] = data.incidents || [];
      // augment with local merged flag
      try {
        const ids = new Set(list.map((i: any) => i.id));
        const rows = await (await import('../db/dexie')).db.incidents.bulkGet(Array.from(ids));
        const mergedMap = new Map<string, boolean>();
        rows.forEach((r: any) => { if (r) mergedMap.set(r.id, !!r.merged); });
        const withFlags = list.map((i: any) => ({ ...i, merged: mergedMap.get(i.id) }));
        setItems(withFlags as any);
      } catch {
        setItems(list);
      }
    } catch (e: any) {
      // Fallback: show local Dexie incidents if available
      try {
        const local = await db.incidents.orderBy('updatedAt').reverse().toArray();
        setItems(local as any);
        setError('API unavailable — showing local data');
      } catch {
        setError(e?.message || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('incidents-updated' as any, handler);
    return () => window.removeEventListener('incidents-updated' as any, handler);
  }, []);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Copied ID' } } as any));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Copy failed' } } as any));
    }
  };

  const StatusBadge = ({ s }: { s?: string }) => {
    const map: any = {
      OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
      RESOLVED: 'bg-slate-100 text-slate-800 border-slate-200',
      REJECTED: 'bg-rose-100 text-rose-800 border-rose-200'
    };
    return s ? <span className={`text-xxs px-1.5 py-0.5 rounded-full border ${map[s]||'bg-slate-100 text-slate-800 border-slate-200'}`}>{s.replace('_',' ')}</span> : null;
  };
  const SevBadge = ({ v }: { v?: string }) => {
    const map: any = {
      LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
      HIGH: 'bg-red-50 text-red-700 border-red-200'
    };
    return v ? <span className={`text-xxs px-1.5 py-0.5 rounded-full border ${map[v]||'bg-slate-50 text-slate-700 border-slate-200'}`}>{v}</span> : null;
  };

  return (
    <div className="space-y-3 card card-hover p-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Recent Incidents</h2>
        <button onClick={load} className="text-sm underline">Refresh</button>
      </div>
      {loading && (
        <ul className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="h-4 bg-slate-200 rounded w-2/3" />
          ))}
        </ul>
      )}
      {error && (
        <div className="text-sm text-amber-700">
          {error}. Use Mock DB or click “Add demo data”, then Sync.
        </div>
      )}
      <ul className="space-y-1">
        {items.map((i: any) => (
          <li key={i.id} className="text-sm flex items-center justify-between">
            <span className="font-medium flex items-center gap-2">
              {i.title}
              <StatusBadge s={i.status} />
              <SevBadge v={i.severity} />
            </span>
            {i.merged && <span className="ml-2 text-amber-600">merged</span>}
            <button className="ml-2 underline" onClick={() => copyId(i.id)}>Copy ID</button>
          </li>
        ))}
        {items.length === 0 && !loading && !error && (
          <li className="text-sm text-slate-600">No incidents yet.</li>
        )}
      </ul>
    </div>
  );
}
