import Dexie, { Table } from 'dexie';

export interface IncidentRow { id: string; title: string; description?: string; status: string; severity?: string; updatedAt: string; draft?: boolean; merged?: boolean; lat?: number; lng?: number }
export interface MediaRow { id: string; incidentId: string; blob?: Blob; storageKey?: string }
export interface OpRow { id: string; entityId: string; ts: number; type: string; payload: any }
export interface KvRow { key: string; value: any }

export class IncidentDB extends Dexie {
  incidents!: Table<IncidentRow, string>;
  media!: Table<MediaRow, string>;
  ops!: Table<OpRow, string>;
  kv!: Table<KvRow, string>;
  constructor() {
    super('incident-mapper');
    this.version(1).stores({
      incidents: '&id, status, updatedAt',
      media: '&id, incidentId',
      ops: '&id, entityId, ts',
      kv: '&key'
    });
  }
}

export const db = new IncidentDB();
