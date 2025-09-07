-- Enable PostGIS extension and add GEOGRAPHY column after base tables exist.
-- This file complements the Prisma-generated DDL.

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Incident' AND column_name = 'geom'
  ) THEN
    ALTER TABLE "Incident" ADD COLUMN "geom" GEOGRAPHY(POINT,4326);
  END IF;
END $$;

