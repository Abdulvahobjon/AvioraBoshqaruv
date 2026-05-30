-- Project: short code for meeting UID prefix
ALTER TABLE "projects" ADD COLUMN "code" TEXT;

-- Meeting: uid, title, finished_at
ALTER TABLE "meetings" ADD COLUMN "uid" TEXT;
ALTER TABLE "meetings" ADD COLUMN "title" TEXT;
ALTER TABLE "meetings" ADD COLUMN "finished_at" TIMESTAMP(3);

-- Unique UID
CREATE UNIQUE INDEX "meetings_uid_key" ON "meetings"("uid");
