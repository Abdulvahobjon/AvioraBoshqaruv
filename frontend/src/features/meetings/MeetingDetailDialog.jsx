import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Clock, ExternalLink, ChevronDown, ChevronUp, Send, CheckCircle2, Video, Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useMeeting, useSubmitReason } from './meetingsApi';
import { MeetingStatusBadge } from './MeetingStatusBadge';

function attendanceMeta(a) {
  if (a.attended) return { label: 'Qatnashdi', tone: 'success' };
  if (a.absenceReason) return { label: 'Qatnashmadi | Sababli', tone: 'warning' };
  return { label: 'Qatnashmadi | Sababsiz', tone: 'error' };
}

export function MeetingDetailDialog({ meetingId, open, onClose, onFinish }) {
  const myId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const { data: meeting, isLoading } = useMeeting(meetingId);
  const submitReason = useSubmitReason();
  const [expanded, setExpanded] = useState(null);
  const [reason, setReason] = useState('');

  // Creator (or admin) can finish a meeting that isn't finished yet.
  const canFinish = !!meeting && !meeting.finishedAt && !!onFinish &&
    (meeting.createdBy === myId || ['superadmin', 'admin'].includes(role));

  const copyMeet = () => { navigator.clipboard?.writeText(meeting.meetLink); toast.success('Havola nusxalandi'); };

  const send = () => {
    if (!reason.trim()) { toast.error('Sabab kiriting'); return; }
    submitReason.mutate({ id: meetingId, reason: reason.trim() }, {
      onSuccess: () => { toast.success('Sabab yuborildi'); setReason(''); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Yig'ilish ma'lumotlari"
      size="lg"
      footer={canFinish ? (
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Yopish</Button>
          <Button onClick={() => onFinish(meeting.id)}><CheckCircle2 className="h-4 w-4" /> Yig'ilishni yakunlash</Button>
        </div>
      ) : undefined}
    >
      {isLoading || !meeting ? (
        <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /></div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-text-strong">{meeting.title}</h3>
              {meeting.uid && <Badge tone="muted">{meeting.uid}</Badge>}
              <MeetingStatusBadge meeting={meeting} />
            </div>
            <p className="mt-1 text-sm text-text-sub">{meeting.project?.name || 'Umumiy yig\'ilish'}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-text-sub">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-icon-soft" />{formatDate(meeting.startAt, true)}</span>
            {meeting.duration && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-icon-soft" />{meeting.duration} daqiqa</span>}
            {/* "Havola" faqat qo'lda kiritilgan va Meet havolasidan FARQLI bo'lsa ko'rsatiladi (takror bo'lmasligi uchun). */}
            {meeting.link && meeting.link !== meeting.meetLink && (
              <a href={meeting.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-text-accent hover:underline"><ExternalLink className="h-4 w-4" />Havola</a>
            )}
          </div>

          {meeting.meetLink && (
            <div className="flex flex-wrap items-center gap-2">
              <a href={meeting.meetLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-text-white transition-colors hover:bg-accent-sub">
                <Video className="h-4 w-4" /> Google Meet'ga kirish
              </a>
              <Button variant="outline" size="icon" onClick={copyMeet} title="Havolani nusxalash"><Copy className="h-4 w-4" /></Button>
            </div>
          )}

          {meeting.content && <p className="rounded-lg bg-bg-1 p-3 text-sm text-text-sub">{meeting.content}</p>}

          {/* Attendance */}
          <div>
            <p className="mb-2 text-sm font-medium text-text-soft">Yig'ilishga qatnashishlar ({meeting.attendance.length})</p>
            <div className="space-y-2">
              {meeting.attendance.map((a) => {
                const meta = attendanceMeta(a);
                const isMe = a.userId === myId;
                const canSubmitReason = meeting.finishedAt && isMe && !a.attended && !a.absenceReason;
                const isOpen = expanded === a.id;
                return (
                  <div key={a.id} className="rounded-lg border border-stroke-soft">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.user?.fullName} src={a.user?.avatar} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-text-strong">{a.user?.fullName}{isMe && ' (siz)'}</p>
                          <p className="text-xs text-text-soft">{a.user?.position?.name || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {a.absenceReason && (
                          <button onClick={() => setExpanded(isOpen ? null : a.id)} className="text-icon-soft">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {a.absenceReason && isOpen && (
                      <div className="border-t border-stroke-soft px-3 py-2.5 text-sm text-text-sub">{a.absenceReason}</div>
                    )}

                    {canSubmitReason && (
                      <div className="border-t border-stroke-soft p-3">
                        <p className="mb-2 text-xs text-text-soft">Siz bu yig'ilishda qatnashmadingiz. Sababini kiriting:</p>
                        <div className="flex gap-2">
                          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[60px]" placeholder="Sabab..." />
                          <Button size="icon" onClick={send} loading={submitReason.isPending}><Send className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!meeting.attendance.length && <p className="text-sm text-text-soft">Ishtirokchilar yo'q</p>}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
