import dayjs from 'dayjs';

/**
 * Yig'ilishning vaqt va yakunlanish holatiga qarab boy status qaytaradi.
 * Bitta manba — jadval ham, detal oyna ham shu funksiyadan foydalanadi.
 * tone: Badge komponentidagi ranglar (success/error/info/warning/neutral/muted).
 */
export function meetingStatus(m) {
  if (!m) return { label: '—', tone: 'muted' };
  if (m.finishedAt) return { label: 'Yakunlangan', tone: 'success' };

  const now = dayjs();
  const start = dayjs(m.startAt);
  const end = start.add(m.duration || 30, 'minute');

  if (now.isAfter(end)) return { label: "Muddati o'tgan", tone: 'error' };
  if (now.isAfter(start)) return { label: 'Davom etmoqda', tone: 'info', live: true };
  if (start.isSame(now, 'day')) return { label: 'Bugun', tone: 'warning' };
  if (start.diff(now, 'hour') <= 48) return { label: 'Tez orada', tone: 'neutral' };
  return { label: 'Rejada', tone: 'muted' };
}
