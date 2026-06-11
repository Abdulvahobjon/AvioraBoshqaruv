// ── Rol nomlari (UI) ──
export const ROLE_LABELS = {
  superadmin: 'Super admin',
  admin: 'Administrator',
  manager: 'Menejer',
  employee: 'Xodim',
  accountant: 'Buxgalter',
  auditor: 'Nazoratchi',
};

// ── Ariza (Application) holatlari ──
export const APPLICATION_STATUS = {
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  accepted: { label: 'Qabul qilindi', tone: 'success' },
  rejected: { label: 'Rad etildi', tone: 'error' },
};

// ── Loyiha statuslari ──
export const PROJECT_STATUS = {
  planning: { label: 'Rejalashtirilgan', tone: 'neutral' },
  active: { label: 'Faol', tone: 'info' },
  overdue: { label: 'Kechikkan', tone: 'error' },
  completed: { label: 'Yakunlangan', tone: 'success' },
  cancelled: { label: 'Bekor qilingan', tone: 'muted' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: "To'lanmagan", tone: 'error' },
  paid: { label: "To'langan", tone: 'success' },
};

export const CLIENT_TYPE = {
  jismoniy: 'Jismoniy shaxs',
  yuridik: 'Yuridik shaxs',
};

export const CLIENT_STATUS = {
  active: { label: 'Faol', tone: 'success' },
  inactive: { label: 'Nofaol', tone: 'muted' },
};

// ── Vazifa (Kanban) statuslari ──
export const TASK_STATUS = {
  todo: { label: 'Qilinishi kerak', tone: 'warning' },
  in_progress: { label: 'Jarayonda', tone: 'info' },
  done: { label: 'Bajarilgan', tone: 'info' },
  production: { label: 'Ishga tushirilgan', tone: 'success' },
  checked: { label: 'Tekshirilgan', tone: 'success' },
  rejected: { label: 'Rad etilgan', tone: 'error' },
  overdue: { label: "Muddati o'tgan", tone: 'muted' },
};

// Kanban ustunlari tartibi va rangi (referensdagidek)
export const KANBAN_COLUMNS = [
  { status: 'todo', label: 'Qilinishi kerak', dot: '#F59E0B', tint: 'rgba(245,158,11,0.07)', count: '#F59E0B' },
  { status: 'in_progress', label: 'Jarayonda', dot: '#3B82F6', tint: 'rgba(59,130,246,0.07)', count: '#3B82F6' },
  { status: 'done', label: 'Bajarilgan', dot: '#8B5CF6', tint: 'rgba(139,92,246,0.07)', count: '#8B5CF6' },
  { status: 'production', label: 'Ishga tushirilgan', dot: '#22C55E', tint: 'rgba(34,197,94,0.07)', count: '#22C55E' },
  { status: 'checked', label: 'Tekshirilgan', dot: '#06B6D4', tint: 'rgba(6,182,212,0.07)', count: '#06B6D4' },
  { status: 'rejected', label: 'Rad etilgan', dot: '#EF4444', tint: 'rgba(239,68,68,0.07)', count: '#EF4444' },
  { status: 'overdue', label: "Muddati o'tgan", dot: '#6B7280', tint: 'rgba(107,114,128,0.07)', count: '#6B7280' },
];

export const TASK_PRIORITY = {
  low: { label: 'Past', tone: 'muted' },
  medium: { label: "O'rta", tone: 'info' },
  high: { label: 'Yuqori', tone: 'warning' },
  critical: { label: 'Kritik', tone: 'error' },
};

export const TASK_TYPE = {
  bug: 'Bug',
  extra: "Qo'shimcha ish",
  feature: 'Yangi funksiya',
  research: 'Research',
};

export const CURRENCIES = [
  { value: 'UZS', label: "so'm (UZS)" },
  { value: 'USD', label: 'dollar (USD)' },
];

// ── Kundalik rejalar (Daily plans) ──
export const DAILY_PLAN_PRIORITY = {
  low: { label: 'Past', tone: 'muted', dot: '#6B7280' },
  medium: { label: "O'rta", tone: 'info', dot: '#3B82F6' },
  high: { label: 'Yuqori', tone: 'warning', dot: '#F59E0B' },
};

// ── Moliya so'rovi ──
export const FINANCE_STATUS = {
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  paid: { label: "To'langan (Pending)", tone: 'info' },
  closed: { label: 'Yakunlangan', tone: 'success' },
  rejected: { label: 'Rad etilgan', tone: 'error' },
};

export const FINANCE_TYPE = {
  salary: 'Oylik / yechib olish',
  company: 'Kompaniya',
  other: 'Boshqa',
};

// ── Oylik (Payroll) ──
export const PAYROLL_STATUS = {
  draft: { label: 'Qoralama', tone: 'muted' },
  ready: { label: "To'lovga tayyor", tone: 'warning' },
  paid: { label: "To'langan (Pending)", tone: 'info' },
  closed: { label: 'Tasdiqlangan', tone: 'success' },
};

// ── Audit amallari ──
export const AUDIT_ACTION = {
  CREATE: { label: 'Yaratildi', tone: 'success' },
  UPDATE: { label: 'Tahrirlandi', tone: 'info' },
  DELETE: { label: "O'chirildi", tone: 'error' },
  LOGIN: { label: 'Kirish', tone: 'neutral' },
  PAY: { label: "To'lov", tone: 'info' },
  CONFIRM: { label: 'Tasdiqlash', tone: 'success' },
  REJECT: { label: 'Rad etish', tone: 'error' },
  REVERSE: { label: 'Teskari yozuv', tone: 'warning' },
  STATUS: { label: 'Status', tone: 'info' },
  CHECK: { label: 'Tekshirildi', tone: 'success' },
  GENERATE: { label: 'Hisoblandi', tone: 'info' },
  CHANGE_PASSWORD: { label: 'Parol', tone: 'neutral' },
  REVIEW: { label: 'Ko\'rib chiqildi', tone: 'info' },
  RESTORE: { label: 'Tiklandi', tone: 'success' },
  HARD_DELETE: { label: 'Butunlay o\'chirildi', tone: 'error' },
};

// Badge tone -> token-asosli klasslar
export const TONE_CLASSES = {
  success: 'bg-success-soft text-success-strong',
  info: 'bg-accent-disabled text-accent-strong',
  error: 'bg-error-soft text-error-strong',
  warning: 'bg-warning-soft text-warning-strong',
  neutral: 'bg-bg-2 text-text-sub',
  muted: 'bg-bg-1-alt text-text-soft',
};
