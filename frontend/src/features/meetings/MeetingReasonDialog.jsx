import { useState } from 'react';
import { toast } from 'sonner';
import { Send, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useMeeting, useSubmitReason } from './meetingsApi';

/**
 * Qatnashmagan xodim uchun sabab kiritish oynasi (bildirishnoma "meeting_absent" bosilganda ochiladi).
 * Yuborilgach tashkilotchiga xabar ketadi va oyna yopiladi.
 */
export function MeetingReasonDialog({ meetingId, open, onClose }) {
  const myId = useAuthStore((s) => s.user?.id);
  const { data: meeting, isLoading } = useMeeting(meetingId);
  const submitReason = useSubmitReason();
  const [reason, setReason] = useState('');

  const myAtt = meeting?.attendance?.find((a) => a.userId === myId);
  const alreadySent = !!myAtt?.absenceReason;

  const send = () => {
    if (!reason.trim()) { toast.error('Sababni yozing'); return; }
    submitReason.mutate({ id: meetingId, reason: reason.trim() }, {
      onSuccess: () => { toast.success('Sabab yuborildi'); setReason(''); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Yig'ilishga qatnashmadingiz"
      size="lg"
      footer={!alreadySent ? (
        <div className="flex w-full items-center justify-end">
          <Button onClick={send} loading={submitReason.isPending}><Send className="h-4 w-4" /> Yuborish</Button>
        </div>
      ) : undefined}
    >
      {isLoading || !meeting ? (
        <div className="space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-text-soft">Titul raqami</p>
              <p className="truncate text-sm font-semibold text-text-strong">{meeting.title}</p>
            </div>
            <p className="shrink-0 text-sm text-text-sub">{formatDate(meeting.startAt, true)}</p>
          </div>

          {alreadySent ? (
            <div className="flex items-center gap-2 rounded-lg border border-stroke-soft bg-bg-1 px-4 py-3 text-sm text-text-sub">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success-strong" />
              <span>Sabab yuborilgan: «{myAtt.absenceReason}». Tashkilotchi qarorini kuting.</span>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-semibold text-text-strong">Yig'ilishga qatnashmaganligingiz sababini yozing</p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[120px]"
                placeholder="Sababni yozing..."
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
