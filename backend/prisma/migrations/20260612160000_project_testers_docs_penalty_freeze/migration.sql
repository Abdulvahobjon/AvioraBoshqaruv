-- Project: jarima foizi + muzlatish bayrog'i
ALTER TABLE "projects" ADD COLUMN "penalty_percent" INTEGER;
ALTER TABLE "projects" ADD COLUMN "is_frozen" BOOLEAN NOT NULL DEFAULT false;

-- Sinovchilar (testers) — xodimlardan alohida
CREATE TABLE "project_testers" (
  "id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_testers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_testers_project_id_user_id_key" ON "project_testers"("project_id", "user_id");
ALTER TABLE "project_testers" ADD CONSTRAINT "project_testers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_testers" ADD CONSTRAINT "project_testers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Loyiha hujjatlari (nom + havola)
CREATE TABLE "project_documents" (
  "id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_documents_project_id_idx" ON "project_documents"("project_id");
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
