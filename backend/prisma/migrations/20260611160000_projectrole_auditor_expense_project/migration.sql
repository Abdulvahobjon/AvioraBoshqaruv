-- ProjectRole.auditor, Position.name UNIQUE, Expense.project_id (budget variance)

-- 1) ProjectRole enum'ga auditor (per-loyiha Nazoratchi a'zo)
ALTER TYPE "ProjectRole" ADD VALUE IF NOT EXISTS 'auditor';

-- 2) Position.name UNIQUE (takrorlanmas lavozim)
CREATE UNIQUE INDEX IF NOT EXISTS "positions_name_key" ON "positions"("name");

-- 3) Expense.project_id — xarajatni loyihaga bog'lash
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "project_id" INTEGER;

DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
