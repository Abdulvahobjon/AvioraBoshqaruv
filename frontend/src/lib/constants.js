// ── Rol nomlari (UI) ──
export const ROLE_LABELS = {
  superadmin: 'Super admin',
  admin: 'Administrator',
  manager: 'Menejer',
  employee: 'Xodim',
  accountant: 'Buxgalter',
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
  todo: { label: 'Bajarish kerak', tone: 'neutral' },
  in_progress: { label: 'Jarayonda', tone: 'info' },
  overdue: { label: 'Kechikkan', tone: 'error' },
  done: { label: 'Bajarildi', tone: 'success' },
  checked: { label: 'Tekshirildi (QA)', tone: 'success' },
  production: { label: 'Productionda', tone: 'info' },
  rejected: { label: 'Rad etilgan', tone: 'error' },
};

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
};

// Badge tone -> token-asosli klasslar
export const TONE_CLASSES = {
  success: 'bg-bg-2 text-text-accent',
  info: 'bg-accent-disabled text-accent-strong',
  error: 'bg-error-soft text-error-strong',
  warning: 'bg-bg-2-alt text-text-strong',
  neutral: 'bg-bg-2 text-text-sub',
  muted: 'bg-bg-1-alt text-text-soft',
};
