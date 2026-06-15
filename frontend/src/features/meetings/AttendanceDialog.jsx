import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check, CheckCircle2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useMeeting, useFinishMeeting } from './meetingsApi';

/** Finish flow (right drawer): organizer marks who attended; absentees get notified to submit reasons. */
export function AttendanceDialog({ meetingId, open, onClose }) {
  const { data: meeting, isLoading } = useMeeting(meetingId);
  const finish = useFinishMeeting();
  const [attended, setAttended] = useState([]);

  useEffect(() => {
    if (open && meeting) setAttended(meeting.attendance.filter((a) => a.attended).map((a) => a.userId));
  }, [open, meeting]);

  const toggle = (uid) => setAttended((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));

  const doFinish = () => {
    finish.mutate({ id: meetingId, attendedUserIds: attended }, {
      onSuccess: () => { toast.success('Yig\'ilish yakunlandi'); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Yig'ilish ishtirokchilarini belgilang" width="max-w-lg">
      {isLoading || !meeting ? (
        <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-2 border-b border-stroke-soft px-5 py-3">
            <div className="min-w-0">
              <p className="text-xs text-text-soft">Yig'ilish</p>
              <p className="truncate text-sm font-semibold text-text-strong">{meeting.title}</p>
            </div>
            <p className="shrink-0 text-sm text-text-sub">{formatDate(meeting.startAt, true)}</p>
          </div>

          <p className="px-5 pt-3 text-sm font-medium text-text-sub">Qatnashgan xodimlarni tanlang</p>
          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
            {meeting.attendance.map((a) => {
              const checked = attended.includes(a.userId);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.userId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    checked ? 'border-stroke-accent' : 'border-stroke-soft hover:bg-bg-1-alt',
                  )}
                >
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2', checked ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong')}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <Avatar name={a.user?.fullName} src={a.user?.avatar} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-strong">{a.user?.fullName}</p>
                    <p className="truncate text-xs text-text-soft">{a.user?.position?.name || '—'}</p>
                  </div>
                </button>
              );
            })}
            {!meeting.attendance.length && <p className="text-sm text-text-soft">Ishtirokchilar yo'q</p>}
          </div>

          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <span className="text-sm text-text-sub">{attended.length} / {meeting.attendance.length} qatnashdi</span>
            <Button onClick={doFinish} loading={finish.isPending}><CheckCircle2 className="h-4 w-4" /> Tasdiqlash</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
