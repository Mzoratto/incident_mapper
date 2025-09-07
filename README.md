# Incident Mapper (Local-first PWA)

[![CI](https://github.com/Mzoratto/incident_mapper/actions/workflows/ci.yml/badge.svg)](https://github.com/Mzoratto/incident_mapper/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-UNLICENSED-lightgrey.svg)

Local-first incident reporting and moderation system. Report city issues offline, sync later. Moderators dedupe, cluster, and resolve with a PostGIS-backed API. Real-time updates reflect new incidents and status changes.

## Monorepo Layout

```
/ (pnpm workspace)
  packages/
    config/   # tsconfig, eslint, tailwind preset
    schemas/  # zod DTOs shared client/server
    ui/       # shared UI components
  apps/
    web/      # Next.js PWA
    api/      # Fastify API + WebSocket
  infra/
    docker/   # Postgres+PostGIS, MinIO compose
    db/       # Prisma schema
```

## Quickstart (local dev)

```bash
# 1) Infra: Postgres + PostGIS and MinIO
docker compose -f infra/docker/compose.yml up -d

# 2) Install deps
pnpm -w install

# 3) Prisma
cd apps/api
# set DATABASE_URL in .env (see below)
pnpm prisma:generate
# optional: pnpm prisma:migrate  (add GEOGRAPHY via SQL migration later)
cd -

# 4) Run API and Web in two terminals
pnpm --filter @incident/api dev
pnpm --filter @incident/web dev
```

## Environment

- apps/api/.env

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/incidentmapper
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=incident-media
STORAGE_KEY=minio
STORAGE_SECRET=minio12345
PORT=4100
```

- apps/web/.env.local

```
NEXT_PUBLIC_API_URL=http://localhost:4100
NEXT_PUBLIC_WS_URL=ws://localhost:4100
```

## Notes

- SW caches app shell and OSM-like tiles with a simple SWR strategy; background sync stub queues a `/v1/sync` POST.
- Dexie tables: incidents (&id,status,updatedAt), media (&id,incidentId), ops (&id,entityId,ts), kv (&key).
- API is a stub: `/v1/sync` applies `upsertIncident` ops in-memory and broadcasts a WebSocket event.
- Prisma schema includes models; add a migration for PostGIS GEOGRAPHY(Point,4326) for `Incident.geom` via SQL.
- UI/components and schemas are minimal and meant to evolve.

## Scripts

- Web: `pnpm --filter @incident/web dev` (port 3000)
- API: `pnpm --filter @incident/api dev` (port 4100)
- API typecheck: `pnpm --filter @incident/api typecheck`
- API seed: `pnpm --filter @incident/api seed`

## Screenshots

Place screenshots in `docs/screenshots/` and update file names below.

![Home](docs/screenshots/home.svg)
![Map & Moderation](docs/screenshots/map-and-moderation.svg)

## CI

GitHub Actions workflow in `.github/workflows/ci.yml` builds both apps and typechecks the web.

### GitHub Pages

This repo includes `.github/workflows/gh-pages.yml` to export the web app to a static site on the `gh-pages` branch.

- Set repository secrets `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to point to your running API.
- The build sets `GITHUB_PAGES=true` and uses `basePath=/incident_mapper`.
- Note: Next.js export disables rewrites; the app uses absolute API URLs at build time. Service Worker background sync reads the API base from IndexedDB (`kv.apiBase`) which is stored on first load.

## Mode Switch (Mock vs Database)

This project supports a mock in-memory API for quick demos:

- Mock mode: set `MOCK_DB=true` in `apps/api/.env` (default in example). No external DB required. The API seeds a couple of demo incidents.
- Database mode: set `MOCK_DB=false` and configure `DATABASE_URL` to a Postgres instance. Run migrations and seed:

```bash
pnpm --filter @incident/api prisma:migrate
pnpm --filter @incident/api seed
```

Check the current API mode via `GET /health` → `{ ok: true, mode: "mock" | "db" }`. The web top bar shows a chip like `DB: Mock` or `DB: DB`.

## Docker (API)

Build and run the API container:

```bash
docker build -t incident-api ./apps/api
docker run --rm -p 4100:4100 --env DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/incidentmapper incident-api
```


## Testing (future)

- Unit (Vitest), E2E (Playwright, offline), a11y (axe) to be added.

## License

Prototyping use only.

## Demo Steps

Quick way to show the app in action (no DB required):

1) Mock mode: ensure `MOCK_DB=true` in `apps/api/.env` (default in example).
2) Run servers:
   - API: `pnpm --filter @incident/api dev` (4100)
   - Web: `pnpm --filter @incident/web dev` (3000)
3) In the UI:
   - Click “Add demo data” in the report form.
   - Use the map toolbar: “Locate” and “Filters” (status + severity).
   - Open Moderation Queue: Resolve or Duplicate an item.
   - Watch the top bar chips (DB mode, Sync, Presence, Cursor) update live.

Optional: quick seeding from terminal

```bash
# Seeds a handful of demo incidents via API (defaults to http://localhost:4100)
pnpm demo:seed
```

## Create an Animated GIF (README)

Record a short screen capture (10–15s) showing: Add demo data → filters → resolve.

1) Record your screen to MP4 (QuickTime on macOS or any tool).
2) Convert to a high‑quality GIF using ffmpeg palette:

```bash
ffmpeg -y -i demo.mp4 -vf "fps=12,scale=960:-1:flags=lanczos,palettegen" palette.png
ffmpeg -y -i demo.mp4 -i palette.png -lavfi "fps=12,scale=960:-1:flags=lanczos,paletteuse" docs/screenshots/demo.gif
```

Then embed in README:

```md
![Demo](docs/screenshots/demo.gif)
```

## Known Scope (MVP)

- No auth/RBAC, no blur/EXIF media pipeline yet.
- Conflict merge is basic LWW; no vector clocks UI.
- Dedupe is minimal; PostGIS used only in DB mode.
- Limited automated tests (one smoke test in CI).
