"use client";
import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { CheckCircle2, Link2, Copy, Search } from 'lucide-react';

type Incident = { id: string; title: string; status: string };

export function ModerationQueue() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupFor, setDupFor] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/v1/incidents', { cache: 'no-store' });
      const data = await res.json();
      setItems((data.incidents || []) as Incident[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('incidents-updated' as any, h);
    return () => window.removeEventListener('incidents-updated' as any, h);
  }, []);

  const markResolved = async (id: string) => {
    await fetch(`/v1/incidents/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'RESOLVED' }) });
    window.dispatchEvent(new CustomEvent('incidents-updated'));
  };
  const markDuplicate = async (id: string) => {
    const canonicalId = dupFor[id];
    if (!canonicalId) return;
    await fetch(`/v1/incidents/${id}/duplicate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ canonicalId, reason: 'manual' }) });
    window.dispatchEvent(new CustomEvent('incidents-updated'));
    setDupFor((s) => ({ ...s, [id]: '' }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
  }, [items, query]);

  const copyId = async (id: string) => {
    try { await navigator.clipboard.writeText(id); window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Copied ID' } } as any)); } catch {}
  };

  return (
    <div className="space-y-2 card card-hover p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Moderation Queue</h2>
        <button className="text-sm underline" onClick={load}>Refresh</button>
      </div>
      {loading && (
        <ul className="space-y-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="border rounded p-2">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </li>
          ))}
        </ul>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <ul className="space-y-2">
        {filtered.map(i => (
          <li key={i.id} className="border rounded p-2 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                {i.title}
                <span className="text-xxs px-1.5 py-0.5 rounded-full border bg-slate-100">{i.status}</span>
              </div>
              <div className="text-xs text-slate-600">{i.id} <button className="ml-2 underline" onClick={()=>copyId(i.id)}>Copy ID</button></div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-sm underline inline-flex items-center gap-1" onClick={() => markResolved(i.id)}>
                <CheckCircle2 size={14}/> Resolve
              </button>
              <input className="border rounded px-2 py-1 text-sm" placeholder="canonicalId" value={dupFor[i.id]||''} onChange={(e)=>setDupFor(s=>({...s,[i.id]:e.target.value}))} />
              <button className="text-sm underline inline-flex items-center gap-1" onClick={() => markDuplicate(i.id)}>
                <Link2 size={14}/> Duplicate
              </button>
              <button className="text-sm underline inline-flex items-center gap-1" onClick={() => setPickerFor(i.id)}>
                <Search size={14}/> Pick…
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && !loading && <li className="text-sm text-slate-600">No items.</li>}
      </ul>

      <Modal open={!!pickerFor} title="Pick canonical incident" onClose={() => setPickerFor(null)}>
        <div className="flex items-center gap-2 mb-2">
          <input className="border rounded px-2 py-1 w-full" placeholder="Search by title or ID" value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <ul className="space-y-1">
          {items.filter(i => i.id !== pickerFor).map(i => (
            <li key={i.id} className="flex items-center justify-between border rounded p-2">
              <div className="text-sm"><span className="font-medium">{i.title}</span><span className="text-slate-500 ml-2">{i.id.slice(0,8)}…</span></div>
              <div className="flex gap-2">
                <button className="text-sm underline inline-flex items-center gap-1" onClick={()=>copyId(i.id)}>
                  <Copy size={14}/> Copy ID
                </button>
                <button className="text-sm underline" onClick={()=>{ if (pickerFor) setDupFor(s=>({...s,[pickerFor]: i.id})); setPickerFor(null); }}>Select</button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
