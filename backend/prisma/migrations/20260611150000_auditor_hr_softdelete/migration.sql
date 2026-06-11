-- Auditor roli, HR (District/Application), soft-delete (Meeting/Notification), task vaqti

-- 1) Role enum'ga auditor
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'auditor';

-- 2) ApplicationStatus enum
DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3) Region.is_application
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "is_application" BOOLEAN NOT NULL DEFAULT false;

-- 4) Districts jadvali
CREATE TABLE IF NOT EXISTS "districts" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "region_id" INTEGER,
  "is_application" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- 5) Applications jadvali
CREATE TABLE IF NOT EXISTS "applications" (
  "id" SERIAL NOT NULL,
  "full_name" TEXT NOT NULL,
  "birth_date" DATE,
  "phone" TEXT NOT NULL,
  "telegram" TEXT,
  "is_student" BOOLEAN NOT NULL DEFAULT false,
  "university" TEXT,
  "region_id" INTEGER,
  "district_id" INTEGER,
  "position_id" INTEGER,
  "resume" TEXT,
  "portfolio" TEXT,
  "extra_info" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
  "conclusion" TEXT,
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- 6) Task.in_progress_at
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "in_progress_at" TIMESTAMP(3);

-- 7) Meeting / Notification soft-delete
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- 8) Foreign keys
DO $$ BEGIN
  ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_fkey"
    FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "applications" ADD CONSTRAINT "applications_region_id_fkey"
    FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "applications" ADD CONSTRAINT "applications_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "applications" ADD CONSTRAINT "applications_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
