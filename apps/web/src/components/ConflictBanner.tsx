"use client";
import { useEffect, useState } from 'react';
import { db } from '../db/dexie';

export function ConflictBanner() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(true);

  async function refresh() {
    const all = await db.incidents.toArray();
    setCount(all.filter((i: any) => i.merged).length);
  }

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('incidents-updated' as any, handler);
    return () => window.removeEventListener('incidents-updated' as any, handler);
  }, []);

  if (!open || count === 0) return null;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 flex items-center justify-between">
      <div className="text-sm">
        {count} change{count>1?'s':''} merged from server. Review recent incidents.
      </div>
      <div className="flex gap-2">
        <button className="text-sm underline" onClick={() => setOpen(false)}>Dismiss</button>
        <button className="text-sm underline" onClick={async ()=>{ const rows = await db.incidents.toArray(); const ids = rows.filter((r:any)=>r.merged).map((r:any)=>r.id); for (const id of ids) { const r = await db.incidents.get(id); if (r) await db.incidents.put({ ...r, merged: false }); } setCount(0); }}>Clear flags</button>
      </div>
    </div>
  );
}

