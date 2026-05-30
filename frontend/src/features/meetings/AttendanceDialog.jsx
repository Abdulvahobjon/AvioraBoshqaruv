import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { useMeeting, useFinishMeeting } from './meetingsApi';

/** Finish flow: organizer marks who attended; absentees get notified to submit reasons. */
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
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Davomat olish"
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-text-sub">{attended.length} / {meeting?.attendance.length || 0} qatnashdi</span>
          <Button onClick={doFinish} loading={finish.isPending}><CheckCircle2 className="h-4 w-4" /> Yakunlash</Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-text-sub">Yig'ilishda qatnashgan xodimlarni belgilang. Qatnashmaganlarga bildirishnoma boradi va ular sabab kiritishi mumkin.</p>
      {isLoading || !meeting ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {meeting.attendance.map((a) => {
            const checked = attended.includes(a.userId);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.userId)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  checked ? 'border-stroke-accent bg-accent-disabled/40' : 'border-stroke-soft hover:bg-bg-elevation-1-alt',
                )}
              >
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong')}>
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
        </div>
      )}
    </Dialog>
  );
}
