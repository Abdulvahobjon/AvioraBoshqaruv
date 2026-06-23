-- ClientPayment.client_id ixtiyoriy bo'ldi: mijozga bog'lanmagan umumiy tushum (kassaga kirim) saqlash uchun.
-- FK saqlanadi (null qiymatga ruxsat); mavjud yozuvlarga ta'sir yo'q.
ALTER TABLE "client_payments" ALTER COLUMN "client_id" DROP NOT NULL;
