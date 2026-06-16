import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, BellOff, Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';
import dayjs from 'dayjs';
import { useNotifications, useMarkAllRead, useMarkRead, describeNotification, notifLink } from '@/features/notifications/notificationsApi';

/** Group notifications by calendar day (newest first). */
function groupByDay(items) {
  const groups = {};
  for (const n of items) {
    const key = formatDate(n.createdAt);
    (groups[key] ||= []).push(n);
  }
  return Object.entries(groups);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const markAll = useMarkAllRead();
  const markRead = useMarkRead();
  const sentinelRef = useRef(null);

  const pages = data?.pages || [];
  const unread = pages[0]?.unread || 0;
  const items = pages.flatMap((p) => p.items || []);
  const groups = groupByDay(items);

  // Pastga yetganda keyingi sahifani yuklash (infinite scroll).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!open || !el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  const onItemClick = (n) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    navigate(notifLink(n));
  };

  // Qo'ng'iroqni ochish — foydalanuvchi harakati: desktop notification ruxsatini so'rash uchun ham qulay payt.
  const openBell = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setOpen(true);
  };

  return (
    <>
      <button onClick={openBell} className="relative rounded-md p-2 text-icon-sub transition-colors hover:bg-bg-1-alt">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-strong px-1 text-[10px] font-semibold text-text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Bildirishnomalar"
        headerAction={
          unread > 0 && (
            <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-xs font-medium text-text-accent hover:underline">
              <Check className="h-3.5 w-3.5" /> Barchasi o'qish
            </button>
          )
        }
      >
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-text-soft">
            <BellOff className="mb-3 h-10 w-10 text-icon-soft" />
            <p className="text-sm">Bildirishnomalar yo'q</p>
          </div>
        ) : (
          <div>
            {groups.map(([day, list]) => (
              <div key={day}>
                <div className="sticky top-0 bg-bg-1 px-5 py-1.5 text-xs font-medium text-text-soft">{day}</div>
                {list.map((n) => {
                  const d = describeNotification(n);
                  const Icon = d.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => onItemClick(n)}
                      className={cn('group flex w-full cursor-pointer items-start gap-3 border-b border-stroke-soft px-5 py-3 text-left transition-colors hover:bg-bg-1-alt', !n.isRead && 'bg-bg-1/60')}
                    >
                      <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-2 text-icon-accent">
                        <Icon className="h-4 w-4" />
                        {!n.isRead && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-error-strong ring-2 ring-bg-base" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-strong">{d.title}</p>
                        {d.body && <p className="text-xs text-text-sub">{d.body}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-text-soft">{dayjs(n.createdAt).format('HH:mm')}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Infinite scroll sentinel + yuklanish indikatori */}
            <div ref={sentinelRef} className="h-4" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-3 text-text-soft">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
