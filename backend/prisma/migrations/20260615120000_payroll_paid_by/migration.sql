-- Payroll: qaysi buxgalter to'lov qilganini saqlash (Hisobchi)
ALTER TABLE "payrolls" ADD COLUMN "paid_by_id" INTEGER;

ALTER TABLE "payrolls"
  ADD CONSTRAINT "payrolls_paid_by_id_fkey"
  FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payrolls_paid_by_id_idx" ON "payrolls"("paid_by_id");
