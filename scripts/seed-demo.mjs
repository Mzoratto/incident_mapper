// Seed several demo incidents via /v1/sync (works in MOCK_DB or DB modes)
const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

function rnd(n){ return (Math.random()*n)-(n/2); }

async function seed() {
  const baseLat = 40.741, baseLng = -73.989;
  const samples = [
    { title: 'Streetlight out', description: 'Dark corner', status: 'OPEN', severity: 'LOW' },
    { title: 'Pothole', description: 'Needs urgent repair', status: 'OPEN', severity: 'HIGH' },
    { title: 'Icy sidewalk', description: 'Slippery surface', status: 'OPEN', severity: 'MEDIUM' },
    { title: 'Damaged bench', description: 'Broken slats', status: 'IN_PROGRESS', severity: 'LOW' },
    { title: 'Blocked drain', description: 'Water pooling', status: 'OPEN', severity: 'MEDIUM' }
  ];
  const ops = samples.map((s, idx) => {
    const id = `demo-${Date.now()}-${idx}`;
    const lat = baseLat + rnd(0.003);
    const lng = baseLng + rnd(0.003);
    return {
      id,
      type: 'upsertIncident',
      payload: { id, title: s.title, description: s.description, status: s.status, severity: s.severity, lat, lng },
      ts: Date.now(),
      cv: { deviceId: 'seed', counter: idx+1 },
      entityId: id
    };
  });
  const res = await fetch(`${API}/v1/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ops, cursor: null }) });
  console.log('Seed status:', res.status);
}

seed().catch(e => { console.error('Seed failed', e?.message); process.exit(1); });

