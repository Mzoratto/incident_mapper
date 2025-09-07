-- Prisma-managed migration placeholder. You can run:
-- pnpm --filter @incident/api prisma:migrate
-- This file may be replaced by Prisma on first migrate. If you need
-- PostGIS geometry, keep the statements below in your next migration.

-- Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add GEOGRAPHY(Point,4326) to Incident after the table exists
-- Note: Prisma will create the "Incident" table from schema.prisma.
-- Run this AFTER the initial Prisma migration applies the table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Incident' AND column_name = 'geom'
  ) THEN
    ALTER TABLE "Incident" ADD COLUMN "geom" GEOGRAPHY(POINT,4326);
  END IF;
END $$;

