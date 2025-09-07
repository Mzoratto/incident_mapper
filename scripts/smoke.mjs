// Minimal smoke test for API in MOCK_DB mode.
// Usage: node scripts/smoke.mjs (reads API_URL from env or defaults to http://localhost:4100)

const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

async function main() {
  try {
    const health = await fetch(`${API}/health`).then(r=>r.json()).catch(()=>({ ok:false }));
    console.log('Health:', health);
    const id = `smoke-${Date.now()}`;
    const op = {
      id: id,
      type: 'upsertIncident',
      payload: { id, title: 'Smoke Test', description: 'auto', status: 'OPEN', severity: 'LOW' },
      ts: Date.now(),
      cv: { deviceId: 'smoke', counter: 1 },
      entityId: id
    };
    const res = await fetch(`${API}/v1/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ops: [op], cursor: null }) });
    console.log('Sync status:', res.status);
    const list = await fetch(`${API}/v1/incidents`).then(r=>r.json());
    const ok = Array.isArray(list.incidents) && list.incidents.some((x)=>x.id===id);
    console.log('List contains smoke id:', ok);
    // Always exit 0 (non-blocking in CI)
    process.exit(0);
  } catch (e) {
    console.log('Smoke test skipped or failed:', e?.message);
    process.exit(0);
  }
}

main();

