# Aviora Boshqaruv tizimi

IT firma uchun ichki boshqaruv tizimi: **CRM (mijozlar), loyihalar, vazifalar (Kanban), moliya, oyliklar va audit**. Faqat web, to'liq responsiv, light/dark mode.

> **Holat:** Barcha asosiy modullar ishlaydi — Auth + RBAC, Layout/Theme, Mijozlar (CRM), Loyihalar,
> Vazifalar (Kanban), Yig'ilishlar (Google Meet), Moliya (ledger + so'rov workflow), Oyliklar,
> Xarajatlar, Valyutalar, Hisobotlar (Excel/PDF/CSV eksport), Audit, Bildirishnomalar (Socket.io),
> Kunlik rejalar va Sozlamalar. Build: backend `nest build` ✅, frontend `vite build` ✅.

## Texnologiyalar

| Qatlam | Stack |
|---|---|
| Frontend | React 18 (JSX) + Vite · React Router v6 · TanStack Query · Zustand · Tailwind CSS · React Hook Form + Zod · Recharts · Axios · sonner · lucide-react |
| Backend | NestJS · Prisma ORM · PostgreSQL · JWT (access+refresh) · bcrypt · Passport · Swagger |
| Infra | Docker Compose (postgres + backend + frontend) · npm workspaces monorepo |

## Papka strukturasi

```
avioraBoshqaruv/
├── backend/      NestJS API (Prisma, Auth, Clients, Projects, Settings, Audit...)
├── frontend/     React + Vite SPA (tokens, layout, pages, features)
├── docker-compose.yml
├── .env.example
└── package.json  (workspace root)
```

---

## Ishga tushirish (lokal — tavsiya etiladi)

### 1. Talablar
- Node.js ≥ 20
- PostgreSQL ma'lumotlar bazasi — **bulutli** (Neon / Supabase, bepul) yoki lokal

### 2. Bog'liqliklarni o'rnatish
```bash
npm install            # root — barcha workspace'lar
```
(yoki alohida: `cd backend && npm install`, `cd frontend && npm install`)

### 3. Ma'lumotlar bazasini ulash
`backend/.env` faylini oching va `DATABASE_URL` ni o'z Neon/Supabase ulanish satringizga almashtiring:

```env
# Neon namunasi:
DATABASE_URL="postgresql://USER:PASS@ep-xxx.eu-central-1.aws.neon.tech/aviora?sslmode=require"
```

> Neon: https://neon.tech → bepul loyiha yarating → "Connection string" ni nusxalang.

### 4. Migratsiya va seed (test ma'lumotlar)
```bash
npm run db:migrate     # jadvallarni yaratadi
npm run db:seed        # 5 rol uchun test foydalanuvchilar + namuna ma'lumotlar
```

### 5. Ishga tushirish
```bash
npm run dev            # backend (:3000) + frontend (:5173) birga
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

---

## Docker bilan ishga tushirish (ixtiyoriy)

```bash
docker compose up --build
```
Bu `postgres` + `backend` (avtomatik migrate + seed) + `frontend` (nginx) ni ko'taradi.
- Frontend: http://localhost:5173
- API: http://localhost:3000/api

---

## Google Meet / Calendar integratsiyasi

Yig'ilish yaratilganda **"Havolasi" maydoni bo'sh** qoldirilsa, tizim Google Calendar API
(OAuth2 + refresh token) orqali **avtomatik Google Meet havolasi** yaratadi va yozuvga saqlaydi
(`meetLink` + `link`). Havola **qo'lda** kiritilsa, Google'ga murojaat qilinmaydi.

Sozlash uchun `.env` (lokal: `backend/.env`, server: `google-meet.env`) ga quyidagilarni qo'ying:

```env
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REDIRECT_URI="https://developers.google.com/oauthplayground"
GOOGLE_REFRESH_TOKEN="1//04..."
GOOGLE_CALENDAR_ID="primary"
GOOGLE_MEET_TIMEZONE="Asia/Tashkent"
```

- **Maxfiy kalitlar faqat `.env` da** — kodda hardcode qilinmaydi. `.env` git'ga kommit qilinmaydi.
- **Token barqarorligi:** Google Cloud Console'da OAuth "consent screen" **"In production"**
  bo'lsa refresh token **eskirmaydi**. "Testing" rejimida har 7 kunda eskiradi.
- **Token yangilanganda IKKALA fayl yangilanishi shart:** lokal `backend/.env` **va**
  serverdagi `google-meet.env` — so'ng `docker compose up -d --build`.
- **Token sog'ligini tekshirish:** `GET /api/google/health` → `{ ok: true }` yoki `{ ok: false, reason }`
  (admin/superadmin). Token muammosini erta bilish uchun.
- **Havola yaratilmay qolsa:** yig'ilish linksiz saqlanadi (ma'lumot yo'qolmaydi); yig'ilish
  oynasidagi **"Havolani qayta yaratish"** tugmasi orqali (`POST /api/meetings/:id/regenerate-link`)
  qayta urinish mumkin.

---

## Test loginlar

Parol (barchasi uchun): **`Aviora2026!`**

| Rol | Login (Ism Familiya) |
|---|---|
| Super admin | `Asadbek Superadmin` |
| Administrator | `Akmal Adminov` |
| Menejer | `Bekzod Menejer` |
| Buxgalter | `Dilnoza Buxgalter` |
| Xodim | `Sardor Frontendchi` |
| Xodim | `Madina Dizayner` |
| Xodim | `Jasur Backendchi` |

---

## Arxitektura yechimlari

- **Pul** — barcha summalar **BigInt (tiyin = eng kichik birlik)** sifatida saqlanadi; JSON'da string. Frontendda `formatMoney()` formatlaydi.
- **Soft delete** — `deleted_at` ustuni + Prisma middleware (o'qishda avtomatik filtrlash).
- **RBAC** — backend `@Roles()` + `RolesGuard` (global), frontend route guard + rolga qarab sidebar menyu.
- **Auth** — JWT access (15m) + refresh (7d); Axios interceptor 401 da avtomatik refresh qiladi.
- **Audit** — muhim mutatsiyalar `audit_logs` ga JSONB old/new bilan yoziladi; moliyaviy o'zgarishlar flaglanadi.
- **Dizayn tokenlari** — `frontend/src/styles/tokens.css` (light/dark), Tailwind config orqali rang nomlariga bog'langan. Hech qaerda rang hardcode qilinmaydi.

---

## Modullar (tayyor)

- **Moliya** — Ledger (append-only), 3-bosqichli so'rov workflow (pending → paid → closed), balans
- **Valyuta** — UZS/USD kurslari + tarix; pul UZS ga konvertatsiya qilinadi
- **Oyliklar** — oylik = fiks maosh + loyiha ulushlari; atomik to'lov
- **Xarajatlar** — kategoriya bo'yicha, UZS ekvivalenti bilan
- **Vazifalar (Kanban)** — `@hello-pangea/dnd`, faqat-oldinga status pipeline, izoh + fayl
- **Yig'ilishlar** — Google Meet avtomatik link, davomat
- **Hisobotlar** — 7 tur, Excel/PDF/CSV eksport
- **Audit** — JSONB old/new, moliyaviy o'zgarishlar flaglanadi
- **Bildirishnomalar** — Socket.io real-time + cron (deadline tekshiruvi)
- **Kunlik rejalar, Sozlamalar (nomenklatura CRUD)**

## Keyingi bosqichlar (reja)

- Sayqal: empty/loading/error holatlarini to'liq qoplash, responsivlik testlari
- Avtomatlashtirilgan testlar (unit/e2e) qo'shish
