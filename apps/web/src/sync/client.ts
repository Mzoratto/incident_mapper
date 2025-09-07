import { db } from '../db/dexie';
import { API_BASE, apiFetch } from '../lib/api';

type SyncResult = { ok: boolean; error?: string };

export async function syncNow(): Promise<SyncResult> {
  try {
    // Load cursor and ops
    const cursorRow = await db.kv.get('cursor');
    const cursor = cursorRow?.value ?? null;
    const ops = await db.ops.orderBy('ts').toArray();
    // Nothing to do
    if (!ops.length) {
      // still notify UI to refresh in case other clients updated
      dispatchUpdated();
      return { ok: true };
    }

    const res = await apiFetch('/v1/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ops, cursor })
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    // Clear applied ops optimistically (scaffold returns applied = ops)
    const appliedIds: string[] = (data.applied || ops).map((o: any) => o.id);
    await db.ops.bulkDelete(appliedIds);
    if (data.nextCursor) await db.kv.put({ key: 'cursor', value: data.nextCursor });

    // Basic client-side LWW merge: pull server incidents and reconcile with local rows
    let serverList: any[] = [];
    try {
      const listRes = await apiFetch('/v1/incidents', { cache: 'no-store' });
      const listJson = await listRes.json();
      serverList = listJson.incidents || [];
    } catch {}

    for (const inc of serverList) {
      const local = await db.incidents.get(inc.id);
      if (!local) continue;
      const fields = ['title','description','status'];
      let conflict = false;
      for (const f of fields) {
        if (typeof local[f] !== 'undefined' && local[f] !== inc[f]) {
          conflict = true;
        }
      }
      const merged = conflict ? true : false;
      await db.incidents.put({ id: inc.id, title: inc.title, description: inc.description, status: inc.status, updatedAt: inc.updatedAt, draft: false, merged });
    }

    dispatchUpdated();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'sync failed' };
  }
}

function dispatchUpdated() {
  try {
    window.dispatchEvent(new CustomEvent('incidents-updated'));
  } catch {}
}
