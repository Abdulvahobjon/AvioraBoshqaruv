-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Kritik + Yuqori tuzatishlar (audit 2026-06-12)                        ║
-- ║  DIQQAT: bu migratsiya ma'lumotni O'ZGARTIRADI (kurs ×10000).          ║
-- ║  Qo'llashdan oldin DB backup oling. Qo'llash: npx prisma migrate deploy ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── K1: Valyuta kursi Int → BigInt + fixed-point masshtab (×RATE_SCALE=10000) ──
-- Eski qiymat (masalan 12800) yangi masshtabga ko'chiriladi: 12800 → 128000000.
-- Endi 12650.50 kabi kasr kurslar ham yo'qolmasdan saqlanadi.
ALTER TABLE "currencies"
  ALTER COLUMN "rate_to_uzs" TYPE BIGINT USING ("rate_to_uzs"::bigint * 10000);
ALTER TABLE "currency_history"
  ALTER COLUMN "rate_to_uzs" TYPE BIGINT USING ("rate_to_uzs"::bigint * 10000);

-- ── K5: FinanceRequest soft-delete (moliyaviy yozuv hard-delete qilinmaydi) ──
ALTER TABLE "finance_requests" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- ── Y7: LedgerEntry.type erkin string → enum (append-only jadvalda typo bo'lmasin) ──
CREATE TYPE "LedgerType" AS ENUM ('salary', 'company', 'other', 'project_share', 'withdrawal', 'reversal');
ALTER TABLE "ledger_entries"
  ALTER COLUMN "type" TYPE "LedgerType" USING ("type"::"LedgerType");

-- ── Y6: Indekslar (FK / status / deletedAt — list/board/hisobot tezligi uchun) ──
CREATE INDEX "finance_requests_user_id_idx" ON "finance_requests"("user_id");
CREATE INDEX "finance_requests_project_id_idx" ON "finance_requests"("project_id");
CREATE INDEX "finance_requests_status_idx" ON "finance_requests"("status");
CREATE INDEX "finance_requests_deleted_at_idx" ON "finance_requests"("deleted_at");

CREATE INDEX "ledger_entries_user_id_idx" ON "ledger_entries"("user_id");
CREATE INDEX "ledger_entries_request_id_idx" ON "ledger_entries"("request_id");

CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

CREATE INDEX "clients_manager_id_idx" ON "clients"("manager_id");
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");

CREATE INDEX "payrolls_status_idx" ON "payrolls"("status");

CREATE INDEX "client_payments_client_id_idx" ON "client_payments"("client_id");
CREATE INDEX "client_payments_project_id_idx" ON "client_payments"("project_id");

CREATE INDEX "task_files_task_id_idx" ON "task_files"("task_id");
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

CREATE INDEX "meetings_project_id_idx" ON "meetings"("project_id");
CREATE INDEX "meetings_deleted_at_idx" ON "meetings"("deleted_at");

CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");
CREATE INDEX "expenses_project_id_idx" ON "expenses"("project_id");
CREATE INDEX "expenses_deleted_at_idx" ON "expenses"("deleted_at");

CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX "audit_logs_flagged_idx" ON "audit_logs"("flagged");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_deleted_at_idx" ON "notifications"("deleted_at");

CREATE INDEX "applications_status_idx" ON "applications"("status");
CREATE INDEX "applications_deleted_at_idx" ON "applications"("deleted_at");

CREATE INDEX "currency_history_currency_id_idx" ON "currency_history"("currency_id");
