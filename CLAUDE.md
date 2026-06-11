# Aviora Boshqaruv — CLAUDE.md

IT firma uchun ichki ERP. Monorepo (npm workspaces): `backend/` (NestJS) + `frontend/` (React+Vite).

## Buyruqlar

```bash
# Root
npm run dev              # backend (:3000) + frontend (:5173) birga

# Backend (cd backend)
npx nest build           # build (kompilyatsiya tekshiruvi)
npm run start:dev        # watch rejimida
npx prisma migrate deploy   # migratsiyalarni qo'llash (non-interaktiv)
npx prisma generate      # client generatsiya (dev-server ochiq bo'lsa EPERM beradi — avval to'xtating)
node prisma/seed.js      # seed (idempotent bo'lishi SHART — prod crash-loop'dan saqlaydi)

# Frontend (cd frontend)
npx vite build           # build
npm run dev              # dev server
```

> **Eslatma:** Lokal Postgres 16.4 — port **5433**, `C:\Users\Asadbek\.aviora-pg` (Docker emas).
> `prisma migrate dev` bu muhitda interaktiv bo'lib ishlamaydi — migratsiya faylini qo'lda yaratib,
> `prisma migrate deploy` bilan qo'llang.

## Arxitektura konvensiyalari

- **Pul** — har doim **BigInt (tiyin = eng kichik birlik)**; JSON'da string. Frontendda `formatMoney()`.
- **Soft delete** — `deletedAt` ustuni hamma joyda (hard delete yo'q).
- **RBAC** — backend `@Roles()` + global `RolesGuard`; frontend route guard (`RequireRole`) + sidebar.
  Rollar: `superadmin, admin, manager, employee, accountant`.
  ⚠️ Controller klass-darajadagi `@Roles()` metodlarga meros bo'ladi — maxfiy endpoint (maosh/xarajat)
  uchun metodda override qiling, **frontend route rollari bilan mos** bo'lsin.
- **Auth** — JWT access (15m) + refresh (7d); `tokenVersion` orqali revocation (parol o'zgarsa oshadi).
  Axios interceptor 401 da avtomatik refresh (queue bilan).
- **Ledger** — append-only; xato → `reverse` (teskari yozuv), o'chirilmaydi.
  `reversedEntryId` UNIQUE — bir yozuv faqat bir marta teskari qilinadi (P2002 ushlanadi).
- **Audit** — muhim mutatsiyalar `audit_logs` ga JSONB old/new bilan; moliyaviy o'zgarishlar `flagged`.
- **Dizayn tokenlari** — `frontend/src/styles/tokens.css`; rang hech qaerda hardcode qilinmaydi.
- **Fayl yuklash** — `backend/src/common/upload.util.ts`; MIME+kengaytma whitelist (SVG/HTML bloklangan).

## Google Meet

Yig'ilish linksiz yaratilsa, Google Calendar API (OAuth2 + refresh token) avtomatik Meet linki yaratadi.
Faqat `.env` da `GOOGLE_*` kerak (kodda hardcode emas). Sog'lik: `GET /api/google/health` (admin).
Token yangilansa lokal `backend/.env` VA serverdagi `google-meet.env` — ikkalasi ham yangilanishi shart.

## Test loginlar

Parol (barcha): `Aviora2026!` · `Asadbek Superadmin`, `Akmal Adminov`, `Bekzod Menejer`,
`Dilnoza Buxgalter`, `Sardor Frontendchi`.
