-- Eslatmalar (todos) bo'limini olib tashlash
DROP TABLE IF EXISTS "todos";

-- Kundalik rejalar (daily plans) bo'limi
CREATE TYPE "DailyPlanPriority" AS ENUM ('low', 'medium', 'high');

CREATE TABLE "daily_plans" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "time" TEXT,
    "priority" "DailyPlanPriority" NOT NULL DEFAULT 'medium',
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "daily_plans_user_id_date_idx" ON "daily_plans"("user_id", "date");

ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
