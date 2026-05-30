import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { FolderOpen, Wallet, CalendarClock, AlertTriangle, Bell } from 'lucide-react';
import { api } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
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
    case 'task_overdue':
      return { title: 'Vazifa muddati o\'tdi', body: p.title && `'${p.title}' kechikmoqda`, icon: AlertTriangle };
    case 'task_due_today':
      return { title: 'Ertalabki vazifalar', body: p.title && `'${p.title}' vazifasini bugun yakunlash shart!`, icon: FolderOpen };
    case 'meeting_created':
      return { title: 'Yangi yig\'ilish belgilandi', body: p.title, icon: CalendarClock };
    case 'meeting_finished':
      return { title: 'Yig\'ilish yakunlandi', body: 'Yig\'ilishda kimlar qatnashdi', icon: CalendarClock };
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

/** Connects to the Socket.io gateway and refreshes notifications on push. */
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(base, { auth: { token }, transports: ['websocket'] });

    socket.on('notification', (n) => {
      toast.info(describeNotification(n).title);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => socket.disconnect();
  }, [token, qc]);
}
