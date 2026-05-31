# Deploy qo'llanmasi (Production)

Loyiha **2 qismdan** iborat — ularni **alohida** deploy qilish kerak:

| Qism | Nima | Qayerga |
|---|---|---|
| **Frontend** | React (statik) | Vercel ✅ (siz qo'ygansiz) |
| **Backend** | NestJS API (server) | Render / Railway / VPS (hali yo'q ❗) |
| **DB** | PostgreSQL | Neon ✅ (allaqachon bulutda) |

> ❗ **Xato sababi:** Vercel faqat frontendni saqlaydi. `/api/auth/login` so'rovi Vercel domeniga boradi, lekin u yerda backend yo'q → **404**. Backendni alohida hostga qo'yib, frontendni o'shanga ulashingiz kerak.

> ✅ **Muhim:** Neon bazangizda barcha ma'lumotlar (foydalanuvchilar, migratsiyalar) allaqachon bor. Deploy qilingan backend **xuddi shu** `DATABASE_URL` ni ishlatsa — hammasi tayyor, qayta seed shart emas.

---

## 1-qadam: Kodni GitHub'ga yuklash

Render va Vercel Git'dan deploy qiladi:
```bash
git init && git add . && git commit -m "Aviora"
# GitHub'da repo yarating, keyin:
git remote add origin https://github.com/USERNAME/aviora.git
git push -u origin main
```

## 2-qadam: Backendni Render'ga deploy qilish

1. https://render.com → ro'yxatdan o'ting (GitHub bilan).
2. **New → Web Service** → GitHub reponi tanlang.
3. Sozlamalar:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/main.js`
4. **Environment** bo'limida quyidagilarni qo'shing:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection stringingiz (lokaldagi `.env` dan) |
   | `JWT_ACCESS_SECRET` | istalgan uzun maxfiy satr |
   | `JWT_REFRESH_SECRET` | boshqa uzun maxfiy satr |
   | `JWT_ACCESS_EXPIRES` | `15m` |
   | `JWT_REFRESH_EXPIRES` | `7d` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `https://aviora-boshqarov-frontend.vercel.app` (sizning Vercel domeningiz) |
5. **Create Web Service**. Deploy tugagach, manzilni oling, masalan:
   `https://aviora-backend.onrender.com`

> Yoki: repoda `backend/render.yaml` bor — Render'da **New → Blueprint** orqali avtomatik o'qiydi (faqat `DATABASE_URL` va `CORS_ORIGIN` ni qo'lda kiritasiz).

## 3-qadam: Frontendni backendga ulash (Vercel)

1. Vercel → loyihangiz → **Settings → Environment Variables**.
2. Qo'shing:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://aviora-backend.onrender.com` (Render manzili, oxirida `/` yo'q) |
3. **Deployments → ... → Redeploy** (env o'zgarishi build'ga kirishi uchun qayta build shart).

## 4-qadam: Tekshirish

- `https://aviora-backend.onrender.com/api/docs` ochilsa — backend ishlayapti.
- Frontendda login qiling: `Asadbek Superadmin` / `Aviora2026!`

---

## Eslatmalar

- **Render free tier** bo'sh turganda uxlaydi — birinchi so'rov ~30s sekin bo'lishi mumkin (xuddi Neon kabi). Backend avtomatik qayta ulanadi.
- **Yuklangan fayllar** (vazifa fayllari) Render'da vaqtinchalik (redeploy'da o'chadi). Doimiy saqlash uchun keyinroq S3/Cloudflare R2 ulanadi.
- **CORS** allaqachon `*.vercel.app` preview domenlarini ham qabul qiladi — preview deploylar ham ishlaydi.
- **Socket.io** (real-time bildirishnoma) `VITE_API_URL` orqali ulanadi — Render WebSocket'ni qo'llab-quvvatlaydi.
