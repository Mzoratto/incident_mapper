"use client";
import { useState } from 'react';
import { Button, Card } from '@incident/ui';
import { syncNow } from '../sync/client';
import { LocateFixed, RefreshCw } from 'lucide-react';
import { db } from '../db/dexie';

export function ReportForm() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState<{lat:number,lng:number}|null>(null);
  const [status, setStatus] = useState<'OPEN'|'IN_PROGRESS'|'RESOLVED'|'REJECTED'>('OPEN');
  const [severity, setSeverity] = useState<'LOW'|'MEDIUM'|'HIGH'>('LOW');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const id = crypto.randomUUID();
    await db.incidents.put({ id, title, description: desc, status, severity, updatedAt: new Date().toISOString(), draft: true, lat: coords?.lat, lng: coords?.lng });
    await db.ops.put({ id: crypto.randomUUID(), entityId: id, ts: Date.now(), type: 'upsertIncident', payload: { id, title, description: desc, status, severity, lat: coords?.lat, lng: coords?.lng } });
    setTitle(''); setDesc(''); setSaving(false);
  }

  async function addDemoData() {
    const base = coords || { lat: 40.741, lng: -73.989 };
    const samples = [
      { title: 'Leaking hydrant', description: 'Water flowing on sidewalk', dlat: 0.0012, dlng: -0.0011, status: 'OPEN', severity: 'MEDIUM' },
      { title: 'Graffiti on wall', description: 'Fresh tags on corner', dlat: -0.0009, dlng: 0.0014, status: 'OPEN', severity: 'LOW' },
      { title: 'Damaged bench', description: 'Broken slats in park', dlat: 0.0005, dlng: 0.0008, status: 'OPEN', severity: 'HIGH' }
    ];
    for (const s of samples) {
      const id = crypto.randomUUID();
      const lat = base.lat + s.dlat; const lng = base.lng + s.dlng;
      await db.incidents.put({ id, title: s.title, description: s.description, status: s.status as any, severity: s.severity as any, updatedAt: new Date().toISOString(), draft: true, lat, lng });
      await db.ops.put({ id: crypto.randomUUID(), entityId: id, ts: Date.now(), type: 'upsertIncident', payload: { id, title: s.title, description: s.description, status: s.status, severity: s.severity, lat, lng } });
    }
    await syncNow();
  }

  return (
    <div className="card card-hover p-4">
      <div className="section-title mb-2">Report an incident</div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input required value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="w-full border rounded px-3 py-2" />
        <textarea value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description" className="w-full border rounded px-3 py-2" />
        <div className="flex items-center gap-3 text-sm">
          <label className="muted">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <label className="muted">Severity</label>
          <select value={severity} onChange={(e)=>setSeverity(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save offline'}</Button>
          <Button
            type="button"
            onClick={()=>{
              if (navigator.serviceWorker?.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'sync-now' });
              } else {
                navigator.serviceWorker?.ready.then(r=>r.sync?.register('sync-ops'));
              }
            }}
          >
            <span className="inline-flex items-center gap-1"><RefreshCw size={16}/> Sync now</span>
          </Button>
          <button
            type="button"
            className="text-sm underline inline-flex items-center gap-1"
            onClick={() => {
              if (!('geolocation' in navigator)) return;
              navigator.geolocation.getCurrentPosition((pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
            }}
          >
            <LocateFixed size={14}/> Use my location {coords ? `(${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})` : ''}
          </button>
        </div>
        <div>
          <button type="button" className="text-sm underline" onClick={addDemoData}>Add demo data</button>
        </div>
      </form>
    </div>
  );
}
