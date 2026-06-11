import dayjs from 'dayjs';
import 'dayjs/locale/uz-latn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('uz-latn');

/**
 * Pul summalari backendda tiyin (eng kichik birlik) sifatida BigInt -> string keladi.
 * formatMoney string/number/bigint qabul qiladi va so'm/dollar ko'rsatadi.
 */
export function formatMoney(tiyin, currency = 'UZS') {
  // BigInt arifmetikasi — katta summalarda (>90 trln so'm) Number precision yo'qolishini oldini oladi.
  let big;
  try {
    big = typeof tiyin === 'bigint' ? tiyin : BigInt(tiyin ?? 0);
  } catch {
    big = BigInt(Math.round(Number(tiyin) || 0)); // float/yaroqsiz string uchun zaxira
  }
  const neg = big < 0n;
  if (neg) big = -big;
  const whole = big / 100n; // tiyin -> butun birlik
  const cents = big % 100n;
  const wholeStr = new Intl.NumberFormat('uz-UZ').format(whole); // Intl BigInt'ni qo'llab-quvvatlaydi
  const body = currency === 'USD' ? `${wholeStr},${cents.toString().padStart(2, '0')}` : wholeStr;
  const suffix = currency === 'USD' ? '$' : "so'm";
  return `${neg ? '-' : ''}${body} ${suffix}`;
}

/** Butun birlikni (so'm) tiyinga aylantirish (formaga kiritishda). */
export function toTiyin(unit) {
  return Math.round(Number(unit || 0) * 100);
}

/** Tiyinni butun birlikka (input qiymati uchun). */
export function fromTiyin(tiyin) {
  return Number(tiyin || 0) / 100;
}

export function formatDate(date, withTime = false) {
  if (!date) return '—';
  return dayjs(date).format(withTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY');
}

export function fromNow(date) {
  if (!date) return '—';
  return dayjs(date).fromNow();
}

/** Deadline countdown: kun/soat qoldi yoki kechikdi. */
export function deadlineInfo(deadline) {
  if (!deadline) return { text: '—', overdue: false };
  const now = dayjs();
  const d = dayjs(deadline);
  const diffMs = d.diff(now);
  const overdue = diffMs < 0;
  const absDays = Math.abs(d.diff(now, 'day'));
  const absHours = Math.abs(d.diff(now, 'hour')) % 24;
  if (overdue) {
    if (absDays > 0) return { text: `${absDays} kun kechikdi`, overdue: true };
    return { text: `${absHours} soat kechikdi`, overdue: true };
  }
  if (absDays > 0) return { text: `${absDays} kun ${absHours} soat qoldi`, overdue: false };
  return { text: `${absHours} soat qoldi`, overdue: false };
}

/** Ism bosh harflari (avatar fallback). */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}

/** Ism asosida barqaror rang (token-asosli bo'lmagan dekorativ avatar fon uchun HSL). */
export function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
