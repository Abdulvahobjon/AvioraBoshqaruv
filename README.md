# Aviora Boshqaruv tizimi

IT firma uchun ichki boshqaruv tizimi: **CRM (mijozlar), loyihalar, vazifalar (Kanban), moliya, oyliklar va audit**. Faqat web, to'liq responsiv, light/dark mode.

> **Holat:** Vertikal qism tayyor — Auth + RBAC, Layout/Theme, Mijozlar (CRM) va Loyihalar to'liq ishlaydi. Qolgan modullar (Kanban, Moliya, Hisobotlar, Audit, Bildirishnomalar...) keyingi bosqichlarda quriladi. UI'da ular "Tez orada" sifatida ko'rinadi.

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

## Keyingi bosqichlar (reja)

5. Moliya (Ledger, 3-bosqichli so'rov workflow, balans), valuta, oylik, xarajatlar
6. Vazifalar (Kanban — dnd-kit), Meeting
7. Dashboard kengaytmasi, hisobotlar (Excel/PDF eksport)
8. Audit log UI, bildirishnomalar (Socket.io + cron), todo, sozlamalar (nomenklatura CRUD)
9. Sayqal: empty/loading/error holatlari, responsivlik testlari
