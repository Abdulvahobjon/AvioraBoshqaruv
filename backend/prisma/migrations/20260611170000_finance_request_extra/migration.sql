-- FinanceRequest: to'lov turi, to'lovchi buxgalter, bekor sababi/vaqti, loyiha

-- PaymentMethod enum
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('card', 'cash');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "finance_requests" ADD COLUMN IF NOT EXISTS "project_id" INTEGER;
ALTER TABLE "finance_requests" ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod";
ALTER TABLE "finance_requests" ADD COLUMN IF NOT EXISTS "paid_by" INTEGER;
ALTER TABLE "finance_requests" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "finance_requests" ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "finance_requests" ADD CONSTRAINT "finance_requests_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "finance_requests" ADD CONSTRAINT "finance_requests_paid_by_fkey"
    FOREIGN KEY ("paid_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
