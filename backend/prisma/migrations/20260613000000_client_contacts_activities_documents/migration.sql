-- Mijoz: kontakt shaxslar, muloqot/faoliyat tarixi, hujjatlar

-- Faoliyat turi
CREATE TYPE "ClientActivityType" AS ENUM ('call', 'meeting', 'email', 'note', 'other');

-- ─────────────── Kontakt shaxslar ───────────────
CREATE TABLE "client_contacts" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────── Faoliyat / muloqot tarixi ───────────────
CREATE TABLE "client_activities" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "user_id" INTEGER,
  "type" "ClientActivityType" NOT NULL DEFAULT 'note',
  "note" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_activities_client_id_idx" ON "client_activities"("client_id");
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────── Hujjatlar ───────────────
CREATE TABLE "client_documents" (
  "id" SERIAL NOT NULL,
  "client_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "uploaded_by_id" INTEGER,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_documents_client_id_idx" ON "client_documents"("client_id");
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
