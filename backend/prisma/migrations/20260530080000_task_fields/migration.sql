-- Task: uid, createdBy, sprint, price, penaltyPercent
ALTER TABLE "tasks" ADD COLUMN "uid" TEXT;
ALTER TABLE "tasks" ADD COLUMN "created_by" INTEGER;
ALTER TABLE "tasks" ADD COLUMN "sprint" INTEGER;
ALTER TABLE "tasks" ADD COLUMN "price" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN "penalty_percent" INTEGER;

CREATE UNIQUE INDEX "tasks_uid_key" ON "tasks"("uid");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
