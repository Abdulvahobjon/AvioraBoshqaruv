-- FinanceRequest: to'lov cheki/kvitansiya fayllari (0-3 ta URL)
ALTER TABLE "finance_requests" ADD COLUMN "receipts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Payroll: KPI bonus va jarima (ma'lumot uchun; pul oqimiga ta'sir qilmaydi)
ALTER TABLE "payrolls" ADD COLUMN "kpi_bonus" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "payrolls" ADD COLUMN "penalty" BIGINT NOT NULL DEFAULT 0;
