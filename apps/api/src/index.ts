import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { prisma } from './prisma';
import dotenv from 'dotenv';
dotenv.config();

const app = Fastify({ logger: true });
let wss: WebSocketServer | null = null;
let onlineCount = 0;

// Plugins
await app.register(cors, {
  origin: true,
  credentials: true
});

// Simple health
app.get('/health', async () => ({ ok: true, mode: useMock ? 'mock' : 'db' }));

// In-memory cursor/events; data persisted in DB
let serverCursor = 0;
const events: any[] = [];
const useMock = (process.env.MOCK_DB === 'true') || !process.env.DATABASE_URL;

// In-memory fallback (MOCK_DB=true or no DATABASE_URL)
const mem = {
  incidents: [] as any[],
  duplicates: [] as any[],
  applied: new Set<string>()
};

if (useMock && mem.incidents.length === 0) {
  // Seed a few demo incidents for portfolio builds
  mem.incidents.push(
    { id: 'demo-1', title: 'Pothole on 3rd Ave', description: 'Large pothole near crosswalk', status: 'OPEN', severity: 'LOW', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lat: 40.741, lng: -73.989 },
    { id: 'demo-2', title: 'Broken streetlight', description: 'Lamp flickers at night', status: 'OPEN', severity: 'LOW', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lat: 40.742, lng: -73.985 }
  );
}

const IncidentStatusEnum = z.enum(['OPEN','IN_PROGRESS','RESOLVED','REJECTED']);
const SyncRequest = z.object({ ops: z.array(z.object({ id: z.any(), type: z.string(), payload: z.any(), ts: z.number(), cv: z.any(), entityId: z.string() })), cursor: z.any().optional() });
const UpsertIncident = z.object({ id: z.string(), title: z.string().min(1), description: z.string().optional(), status: IncidentStatusEnum.optional(), severity: z.enum(['LOW','MEDIUM','HIGH']).optional(), lat: z.number().optional(), lng: z.number().optional() });

app.post('/v1/sync', async (req, reply) => {
  const parsed = SyncRequest.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
  const { ops } = parsed.data;
  for (const op of ops) {
    // extremely naive apply: only upsertIncident for scaffold
    if (op.type === 'upsertIncident') {
      let evt: any;
      if (useMock) {
        const id = String(op.id);
        if (mem.applied.has(id)) continue;
        mem.applied.add(id);
        const payload = UpsertIncident.parse(op.payload);
        const existing = mem.incidents.find((x) => x.id === payload.id);
        if (existing) {
          Object.assign(existing, payload, { updatedAt: new Date().toISOString() });
        } else {
          mem.incidents.push({ ...payload, status: payload.status || 'OPEN', severity: payload.severity || 'LOW', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
        const inc = mem.incidents.find((x) => x.id === payload.id);
        evt = { type: 'incident.upsert', incident: inc };
      } else {
        // idempotency: skip if op.id was applied
        try { await prisma.appliedOp.create({ data: { id: String(op.id) } }); } catch { continue; }
        let payload: z.infer<typeof UpsertIncident>;
        try { payload = UpsertIncident.parse(op.payload); } catch { return reply.code(400).send({ error: 'invalid_payload' }); }
        await prisma.incident.upsert({
          where: { id: payload.id },
          update: { title: payload.title, description: payload.description || '', status: (payload.status as any) || undefined, severity: (payload.severity as any) || undefined, lat: payload.lat, lng: payload.lng },
          create: { id: payload.id, title: payload.title, description: payload.description || '', status: 'OPEN', severity: payload.severity || 'LOW', lat: payload.lat, lng: payload.lng }
        });
        const inc = await prisma.incident.findUnique({ where: { id: payload.id } });
        evt = { type: 'incident.upsert', incident: inc };
      }
      serverCursor++;
      events.push({ cursor: serverCursor, data: evt });
      // broadcast
      const msg = JSON.stringify(evt);
      if (wss) wss.clients.forEach((c) => c.readyState === 1 && c.send(msg));
    }
  }
  return { applied: ops, events: [], nextCursor: serverCursor.toString() };
});

app.get('/v1/incidents', async (_req, reply) => {
  if (useMock) {
    return { incidents: mem.incidents.slice().sort((a,b)=> (a.updatedAt < b.updatedAt ? 1 : -1)) };
  }
  try {
    const incidents = await prisma.incident.findMany({ orderBy: { updatedAt: 'desc' } });
    return { incidents };
  } catch {
    reply.header('x-mode', 'fallback-mock');
    return { incidents: mem.incidents.slice().sort((a,b)=> (a.updatedAt < b.updatedAt ? 1 : -1)) };
  }
});

// Update incident (e.g., status change)
app.patch<{ Params: { id: string } }>('/v1/incidents/:id', async (req, reply) => {
  const id = (req.params as any).id;
  const body = (req.body as any) || {};
  const PatchSchema = z.object({ title: z.string().min(1).optional(), description: z.string().optional(), status: IncidentStatusEnum.optional(), lat: z.number().optional(), lng: z.number().optional() });
  const parse = PatchSchema.safeParse(body);
  if (!parse.success) return reply.code(400).send({ error: 'invalid_payload' });
  let evt: any;
  if (useMock) {
    const i = mem.incidents.find((x) => x.id === id);
    if (!i) return reply.code(404).send({ error: 'not_found' });
    const prev = { ...i };
    Object.assign(i, body, { updatedAt: new Date().toISOString() });
    evt = body.status && body.status !== prev.status ? { type: 'incident.status', id, status: body.status } : { type: 'incident.upsert', incident: i };
  } else {
    const prev = await prisma.incident.findUnique({ where: { id } });
    if (!prev) return reply.code(404).send({ error: 'not_found' });
    const updated = await prisma.incident.update({ where: { id }, data: { ...('status' in body ? { status: body.status } : {}), ...('title' in body ? { title: body.title } : {}), ...('description' in body ? { description: body.description } : {}), ...('lat' in body ? { lat: body.lat } : {}), ...('lng' in body ? { lng: body.lng } : {}) } });
    evt = body.status && body.status !== prev.status ? { type: 'incident.status', id, status: body.status } : { type: 'incident.upsert', incident: updated };
  }
  serverCursor++;
  events.push({ cursor: serverCursor, data: evt });
  if (wss) wss.clients.forEach((c) => c.readyState === 1 && c.send(JSON.stringify(evt)));
  return useMock ? { ok: true } : { incident: (evt.incident || null) };
});

// Mark duplicate
app.post<{ Params: { id: string } }>('/v1/incidents/:id/duplicate', async (req, reply) => {
  const srcId = (req.params as any).id;
  const DupSchema = z.object({ canonicalId: z.string().min(1), reason: z.string().optional() });
  const parsedBody = DupSchema.safeParse(req.body || {});
  if (!parsedBody.success) return reply.code(400).send({ error: 'bad_request' });
  const { canonicalId, reason } = parsedBody.data;
  if (useMock) mem.duplicates.push({ id: String(Date.now()), srcIncidentId: srcId, dstCanonicalIncidentId: canonicalId, reason: reason || '' });
  else await prisma.duplicateLink.create({ data: { srcIncidentId: srcId, dstCanonicalIncidentId: canonicalId, reason: reason || '' } });
  const evt = { type: 'incident.duplicate', srcId, canonicalId };
  serverCursor++;
  events.push({ cursor: serverCursor, data: evt });
  if (wss) wss.clients.forEach((c) => c.readyState === 1 && c.send(JSON.stringify(evt)));
  return { ok: true };
});

// no-op: IDs provided by client or DB defaults

// Start server and attach WS
const port = Number(process.env.PORT || 4100);
const server = await app.listen({ port, host: '0.0.0.0' });
app.log.info(`API listening on ${server}`);

wss = new WebSocketServer({ server: app.server });
wss.on('connection', (socket) => {
  onlineCount++;
  const broadcastPresence = () => {
    const msg = JSON.stringify({ type: 'presence', count: onlineCount });
    wss?.clients.forEach((c) => c.readyState === 1 && c.send(msg));
  };
  broadcastPresence();
  socket.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data));
      if (msg && msg.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    } catch {}
  });
  socket.on('close', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    broadcastPresence();
  });
});
