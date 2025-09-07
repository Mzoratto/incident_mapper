import { z } from 'zod';

export const IncidentStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']);
export const Severity = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const Incident = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  status: IncidentStatus.default('OPEN'),
  severity: Severity.default('LOW'),
  createdAt: z.string(),
  updatedAt: z.string(),
  address: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  // geom stored server-side as GEOGRAPHY(Point,4326)
});

export const Media = z.object({
  id: z.string(),
  incidentId: z.string(),
  storageKey: z.string(),
  width: z.number(),
  height: z.number(),
  blurApplied: z.boolean().default(false),
  createdAt: z.string()
});

export const Vote = z.object({ id: z.string(), incidentId: z.string(), userId: z.string(), kind: z.enum(['up', 'down']) });

export const SyncOpType = z.enum(['upsertIncident', 'patchIncident', 'vote', 'linkDuplicate', 'uploadMedia']);

export const ChangeVector = z.object({ deviceId: z.string(), counter: z.number().int().nonnegative() });

export const SyncOp = z.object({
  id: z.string(),
  type: SyncOpType,
  payload: z.record(z.any()),
  ts: z.number(),
  cv: ChangeVector,
  entityId: z.string()
});

export const SyncRequest = z.object({ ops: z.array(SyncOp), cursor: z.string().nullish() });
export const SyncResponse = z.object({ applied: z.array(SyncOp).default([]), events: z.array(z.record(z.any())).default([]), nextCursor: z.string().nullish() });

export type Incident = z.infer<typeof Incident>;
export type Media = z.infer<typeof Media>;
export type Vote = z.infer<typeof Vote>;
export type SyncOp = z.infer<typeof SyncOp>;
export type SyncRequest = z.infer<typeof SyncRequest>;
export type SyncResponse = z.infer<typeof SyncResponse>;

