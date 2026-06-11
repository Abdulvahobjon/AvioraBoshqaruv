-- Bir ledger yozuvi faqat bir marta teskari qilinishini ta'minlaydi (dubl-himoya).
-- Postgres NULL qiymatlarni unique hisoblamaydi, shuning uchun teskari qilinmagan yozuvlar muammosiz.
CREATE UNIQUE INDEX "ledger_entries_reversed_entry_id_key" ON "ledger_entries"("reversed_entry_id");
