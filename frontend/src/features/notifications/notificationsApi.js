import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { FolderOpen, Wallet, CalendarClock, AlertTriangle, Bell } from 'lucide-react';
import { api } from '@/lib/api/axios';
import { getAuth, useAuthStore } from '@/store/authStore';
import { formatMoney } from '@/lib/utils/format';

/**
 * Map a notification to { title, body, icon } for rich rendering.
 * payload fields vary by type (title, projectName, amount, requester, ...).
 */
export function describeNotification(n) {
  const p = n.payload || {};
  switch (n.type) {
    case 'task_assigned':
      return { title: 'Yangi vazifa', body: p.title && `'${p.title}' vazifasi sizga biriktirildi`, icon: FolderOpen };
    case 'task_rejected':
      return { title: 'Vazifa rad etildi', body: p.title && `'${p.title}' — ${p.reason || 'qayta ishlang'}`, icon: FolderOpen };
    case 'task_checked':
      return { title: 'Vazifa tasdiqlandi', body: p.title && `'${p.title}' tekshiruvdan o'tdi`, icon: FolderOpen };
    case 'task_status':
      return { title: 'Vazifa holati o\'zgardi', body: p.title && `'${p.title}' — yangi holat`, icon: FolderOpen };
    case 'task_overdue':
      return { title: 'Vazifa muddati o\'tdi', body: p.title && `'${p.title}' kechikmoqda`, icon: AlertTriangle };
    case 'task_due_today':
      return { title: 'Ertalabki vazifalar', body: p.title && `'${p.title}' vazifasini bugun yakunlash shart!`, icon: FolderOpen };
    case 'meeting_created':
      return { title: 'Yangi yig\'ilish belgilandi', body: p.title, icon: CalendarClock };
    case 'meeting_finished':
      return { title: 'Yig\'ilish yakunlandi', body: 'Yig\'ilishda kimlar qatnashdi', icon: CalendarClock };
    case 'meeting_reminder':
      return { title: 'Yig\'ilish tez orada boshlanadi', body: p.title ? `'${p.title}' yig'ilishi boshlanmoqda` : 'Yig\'ilishingiz boshlanmoqda', icon: CalendarClock };
    case 'meeting_absent':
      return { title: 'Siz yig\'ilishda ishtirok etmadingiz', body: p.title ? `'${p.title}' — sababini kiriting` : 'Sababini kiriting', icon: CalendarClock };
    case 'expense_request':
      return { title: 'Yangi xarajat so\'rovi', body: `${p.requester || 'Xodim'} tomonidan ${formatMoney(p.amount)} miqdorida yangi so'rov yaratildi`, icon: Wallet };
    case 'request_paid':
      return { title: 'So\'rovingiz to\'landi', body: p.amount && `${formatMoney(p.amount)} to'landi — tasdiqlang`, icon: Wallet };
    case 'request_rejected':
      return { title: 'So\'rovingiz rad etildi', body: null, icon: Wallet };
    case 'payroll_paid':
      return { title: 'Oyligingiz to\'landi', body: p.month && `${p.month} oyligi — tasdiqlang`, icon: Wallet };
    case 'project_added':
      return { title: 'Loyihaga qo\'shildingiz', body: p.projectName && `'${p.projectName}' loyihasiga qo'shildingiz`, icon: FolderOpen };
    case 'project_overdue':
      return { title: 'Loyiha muddati o\'tdi', body: p.projectName && `'${p.projectName}' loyihasi rejadagidan kechikmoqda`, icon: AlertTriangle };
    case 'project_status':
      if (p.status === 'cancelled')
        return { title: 'Loyiha to\'xtatildi', body: p.projectName && `'${p.projectName}' loyihasi to'xtatildi`, icon: AlertTriangle };
      if (p.status === 'completed')
        return { title: 'Loyiha yakunlandi', body: p.projectName && `'${p.projectName}' loyihasi yakunlandi`, icon: FolderOpen };
      return { title: 'Loyiha holati o\'zgardi', body: p.projectName && `'${p.projectName}' holati yangilandi`, icon: FolderOpen };
    default:
      return { title: 'Yangi bildirishnoma', body: p.title || null, icon: Bell };
  }
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/notifications/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete('/notifications/clear')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Where a notification leads when clicked. */
export function notifLink(n) {
  const p = n.payload || {};
  const t = n.type || '';
  if (t.startsWith('task')) return '/tasks';
  if (t.startsWith('meeting')) return '/meetings';
  if (t === 'payroll_paid') return '/payroll';
  if (t === 'expense_request' || t.startsWith('request')) return '/finance';
  if (t.startsWith('project')) return p.projectId ? `/projects/${p.projectId}` : '/projects';
  return '/';
}

/** Brauzer (desktop) notification — sahifa ochiq bo'lganда kompyuterga chiqadi.
 *  Bosilganда oyna fokuslanadi, bo'limga o'tadi va o'qilgan deb belgilanadi. */
function showDesktopNotification(n, openNotif) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const d = describeNotification(n);
  try {
    const native = new Notification(d.title, {
      body: d.body || '',
      icon: '/favicon.svg',
      tag: `aviora-notif-${n.id}`, // bir bildirishnoma takror chiqmaydi
    });
    native.onclick = () => {
      window.focus();
      openNotif(n);
      native.close();
    };
  } catch {
    /* ba'zi brauzerlar new Notification() ni bloklashi mumkin — e'tiborsiz qoldiramiz */
  }
}

/** Connects to the Socket.io gateway and refreshes notifications on push.
 *  Real-time: in-app toast + brauzer (desktop) notification. */
export function useNotificationSocket() {
  // Faqat auth bor/yo'qligiga bog'lanamiz (token qiymatiga emas) — token-refresh socket'ni uzmaydi.
  const isAuthed = useAuthStore((s) => !!s.accessToken);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Bildirishnomani "ochish": bo'limga o'tish + o'qilgan deb belgilash.
  const openNotif = (n) => {
    navigate(notifLink(n));
    api.patch(`/notifications/${n.id}/read`)
      .then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => {});
  };

  // Desktop notification uchun ruxsat so'raymiz (bir marta, login bo'lganda).
  useEffect(() => {
    if (!isAuthed) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(base, {
      // WebSocket birinchi; ulanmasa polling'ga tushadi (ba'zi proxylar WS upgrade'ni bloklaydi).
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
      // Token har ulanish/qayta-ulanishda store'dan yangi o'qiladi.
      auth: (cb) => cb({ token: getAuth().accessToken }),
    });

    socket.on('notification', (n) => {
      const d = describeNotification(n);
      // 1) Ilova ichida toast (bosilsa bo'limga o'tadi + o'qiladi).
      toast.info(d.title, {
        description: d.body || undefined,
        action: { label: "Ko'rish", onClick: () => openNotif(n) },
      });
      // 2) Kompyuter (brauzer) notification'i.
      showDesktopNotification(n, openNotif);
      // 3) Ro'yxatni yangilash (qo'ng'iroq belgisidagi soni va ro'yxat).
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    // Qayta ulanganda o'tkazib yuborilgan bildirishnomalarni sinxronlash.
    socket.on('reconnect', () => qc.invalidateQueries({ queryKey: ['notifications'] }));

    return () => socket.disconnect();
  }, [isAuthed, qc, navigate]); // eslint-disable-line react-hooks/exhaustive-deps
}
