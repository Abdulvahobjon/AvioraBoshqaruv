import { useAuthStore } from '@/store/authStore';

/**
 * Frontend RBAC — backend @Roles matritsasining AKSI (yagona manba shu yer).
 * Maqsad: foydalanuvchining AKTIV roli ruxsat bermaydigan amal tugmalari ko'rinmasin.
 *
 * Eslatma: backendda `AuditorReadOnlyGuard` GLOBAL — "auditor" (Nazoratchi) butun ilovada
 * faqat-o'qish, faqat vazifa tekshiruvi (checked/rejected) bundan mustasno. Shuning uchun
 * quyidagi ro'yxatlarda auditor faqat `tasks.review`da bor.
 *
 * Asl himoya HAR DOIM backendda. Bu faqat UI ko'rinishini moslaydi.
 */
const SA = 'superadmin';
const AD = 'admin';
const MN = 'manager';
const EM = 'employee';
const AC = 'accountant';
const AU = 'auditor';

const PERMISSIONS = {
  // Faqat boshqaruv
  'users.manage': [SA, AD],
  'projects.manage': [SA, AD], // create/update/delete/restore/freeze
  'currency.manage': [SA, AD],
  'trash.manage': [SA, AD],

  // Mijozlar
  'clients.create': [SA, AD, MN],
  'clients.update': [SA, AD, MN],
  'clients.delete': [SA, AD],

  // Vazifalar
  'tasks.create': [SA, AD, MN],
  'tasks.manage': [SA, AD, MN], // duplicate/delete
  'tasks.work': [SA, AD, MN, EM, AC], // izoh, fayl, status (auditordan tashqari)
  'tasks.review': [SA, AD, MN, AU], // checked/rejected — yakuniy ruxsatni backend `canReview` beradi

  // Yig'ilishlar
  'meetings.create': [SA, AD, MN],
  'meetings.attend': [SA, AD, MN, EM, AC], // davomat sababi (auditordan tashqari)

  // Moliya
  'finance.request': [SA, AD, MN, EM, AC], // so'rov yuborish / tasdiqlash (auditordan tashqari)
  'finance.process': [SA, AC], // to'lash / rad etish — faqat buxgalter va superadmin
  'expenses.write': [SA, AD, AC],
  'payroll.manage': [SA, AD, AC],
  'income.manage': [SA, AD, AC], // qo'shimcha (mijozsiz) tushum kiritish/o'chirish — Sozlamalar tab

  // Ma'lumotnomalar (Sozlamalar)
  'references.manage': [SA, AD, MN],

  // Kundalik rejalar (shaxsiy — auditordan tashqari hammaga)
  'dailyplans.manage': [SA, AD, MN, EM, AC],
};

/** role berilgan amalni bajara oladimi? */
export function can(role, key) {
  const allowed = PERMISSIONS[key];
  return !!allowed && allowed.includes(role);
}

/** React hook: aktiv rol bo'yicha `can(key)` qaytaradi. */
export function useCan() {
  const role = useAuthStore((s) => s.user?.role);
  return (key) => can(role, key);
}
