# Byterover Handbook

Generated: 2025-09-07

## Layer 1: System Overview

Purpose: Local‑first Incident Mapper PWA to report and moderate city issues (potholes, lights, ice). Works fully offline with photos/GPS/notes and syncs later. Moderators deduplicate, cluster, and resolve via a PostGIS‑backed API. Real‑time updates reflect new incidents and status changes.

Tech Stack: Next.js (App Router), TypeScript, React 18, MapLibre GL, Dexie (IndexedDB), Service Worker + Background Sync, Web Workers, TanStack Query, Zustand, Tailwind + shadcn/ui; Backend: Next.js API routes or Fastify/Express, Prisma ORM, Postgres 15 + PostGIS 3, tRPC (optional), ws/WebSocket, Zod; Infra: Docker, Railway/Render/Fly, Neon/Supabase, Cloudflare R2/S3, Cloudflare CDN, GitHub Actions; Testing: Vitest, Testing Library, Playwright, ESLint, Prettier, TypeCheck.

Architecture: Mono‑repo with `packages/` for shared UI, schemas, and config; `apps/web` for the PWA (Dexie ops log, SW cache, workers for image privacy pipeline); `apps/api` for REST + WebSocket; `infra/` for dockerized Postgres+PostGIS and object storage; `infra/db` for Prisma schema and seeds. Client maintains an ops log and shadow cache; server applies idempotent ops and emits events; clients subscribe via WebSocket for live updates.

Key Technical Decisions:
- Local‑first with append‑only ops log and background sync; deterministic field‑level LWW conflict resolution with change vectors and wall‑clock tie‑break.
- Privacy by default: EXIF strip and optional face/license‑plate blur prior to upload in a Worker; private image bucket with signed URLs.
- Spatial intelligence: PostGIS for distance queries, clustering, and dedupe heuristics; client‑side clustering for immediate UX.
- Accessibility/perf budget: keyboard‑first flows, a11y roles, JS ≤ 250KB gz initial, MapLibre loaded on demand, Workers for heavy tasks.

Entry Points: apps/web (Next.js PWA) → `app/(routes)`; SW at `public/sw.js`; Dexie init in `apps/web/src/db/dexie.ts`; workers under `apps/web/src/workers/*`; apps/api (REST in `/v1/*`, WebSocket gateway); Prisma schema at `infra/db/schema.prisma`.

---

## Layer 2: Module Map

Core Modules:
- Web PWA (Next.js): App shell, routing, report wizard, map view, moderation views, sync indicator, conflict banner.
- Local Store (Dexie): incidents, media blobs, ops log, kv (cursor/lastSyncAt); idempotent op producer/consumer.
- Service Worker: app shell + OSM tile caching (SWR), background sync for queued ops, offline fallback.
- Image Pipeline (Workers): compress, strip EXIF, face/plate detect, regional blur, export JPEG.
- Map Module (MapLibre): basemap tiles, markers/clusters, bbox querying, accessible list mirror.
- Sync Client: batch push with cursor, receive server events, apply LWW merge to cache.
- API Server: REST endpoints, `/v1/sync`, incidents CRUD, media upload/presign, duplicate linking, stats; WebSocket events.

Data Layer:
- Postgres + PostGIS: incidents with `GEOGRAPHY(Point,4326)`, media metadata, votes, duplicate_link, audit_log; optional change_vector per incident.
- Object Storage (R2/S3): private originals and thumbnails; signed GETs; lifecycle rules.

Integration Points:
- REST: `/v1/sync`, `/v1/incidents`, `/v1/incidents/:id`, `/v1/incidents/:id/media`, `/v1/incidents/:id/duplicate`, `/v1/stats`.
- WebSocket: `incident.upsert`, `incident.status`, `incident.duplicate`, `stats.update`; client `subscribe`, `ping`.

Utilities:
- Validation with Zod (shared DTOs in `packages/schemas`).
- State with Zustand; data fetching with TanStack Query.
- Logger and error boundary utilities; UUID/idempotency helpers.

Module Dependencies:
- PWA ↔ Dexie (cache/ops); PWA ↔ SW (cache/sync); PWA ↔ Workers (image); PWA ↔ API (REST/ws).
- API ↔ Prisma ↔ Postgres/PostGIS; API ↔ Object Storage; API ↔ WebSocket gateway.

---

## Layer 3: Integration Guide

API Endpoints:
- POST `/v1/sync` → body: `{ ops[], cursor }` → returns `{ applied[], events[], nextCursor }` (idempotent by `op.id`).
- GET `/v1/incidents?bbox=&since=` → list for viewport; supports ETag.
- POST `/v1/incidents` → create; PATCH `/v1/incidents/:id` → update.
- POST `/v1/incidents/:id/media` → presign or direct multipart upload, records metadata.
- POST `/v1/incidents/:id/duplicate` → `{ canonicalId, reason }` → links duplicates.
- GET `/v1/stats` → heatmap buckets, counts, metadata.

Configuration Files:
- `.env` (API): `DATABASE_URL`, `POSTGRES_PASSWORD`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_KEY/SECRET`, `JWT_SECRET` (if used), `CLOUDFLARE_*` (if R2).
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.
- `infra/docker/compose.yml`: Postgres+PostGIS, MinIO/R2 compatible.
- `infra/db/schema.prisma`: Prisma models; raw SQL migration for PostGIS `GEOGRAPHY` column.

External Integrations:
- Postgres 15 + PostGIS 3 (local via Docker; prod via Neon/Supabase with PostGIS).
- Object Storage (Cloudflare R2/S3) for images; CDN via Cloudflare.
- Auth (Clerk/Auth.js) optional; anonymous session supported.

Workflows:
- Sync: client batches ops with cursor → server applies idempotently → returns applied + events since cursor → client merges and advances cursor; retries with exponential backoff via Background Sync.
- Moderation: status changes, duplicate link creation, blur verification; audit_log entry per action; WebSocket broadcast.

Interface Definitions:
- Zod schemas for Incident, Media, Vote, Sync payloads shared in `packages/schemas`.
- WebSocket event types mirrored on client.

---

## Layer 4: Extension Points

Design Patterns:
- Local‑first ops log with LWW field‑level merge and vector clocks.
- SW caching with stale‑while‑revalidate for tiles/app shell.
- Worker‑offloaded image transforms for main‑thread performance.

Extension Points:
- Pluggable dedupe heuristics (distance + fuzzy title, or DBSCAN clusters).
- Additional media pipelines (redaction shapes, OCR for plates with stricter privacy).
- Auth providers and RBAC roles.
- Map layers (heatmap/vector tiles) and analytics buckets.

Customization Areas:
- Storage adapter for different S3‑compatible providers.
- WebSocket gateway abstraction (tRPC/ws or raw ws).
- Theming and component library via `packages/ui`.

Plugin Architecture:
- Light plugin surface via worker and API hooks (pre‑upload transform, post‑op apply, broadcast filters).

Recent Changes:
- Initial handbook generated from project specification; code scaffolding pending.

---

## Quality Validation Checklist

Required Sections
- [x] Layer 1: System Overview completed
- [x] Layer 2: Module Map completed
- [x] Layer 3: Integration Guide completed
- [x] Layer 4: Extension Points completed

Content Quality
- [x] Architecture pattern identified and documented
- [x] At least 3 core modules documented with purposes
- [x] Tech stack matches intended project dependencies
- [x] API endpoints and integration points identified
- [x] Extension points and patterns documented

Completeness
- [x] Templates filled with project information
- [x] No placeholder variables remain
- [x] Information is accurate w.r.t. the spec
- [x] Handbook provides value for navigation and onboarding

