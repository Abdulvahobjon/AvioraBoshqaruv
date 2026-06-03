import { useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, Send, CheckCircle2, XCircle, Pencil, Trash2, Download, RotateCcw } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { formatDate, fromNow, deadlineInfo } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useTask, useAddComment, useUploadFile, useReviewTask, useDeleteTask } from './tasksApi';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function TaskDetailDialog({ taskId, projectId, open, onClose, onEdit }) {
  const role = useAuthStore((s) => s.user?.role);
  const canReview = ['superadmin', 'admin', 'manager'].includes(role);
  const canManage = canReview;

  const { data: task, isLoading } = useTask(taskId);
  const addComment = useAddComment();
  const uploadFile = useUploadFile();
  const review = useReviewTask(projectId);
  const del = useDeleteTask(projectId);

  const [comment, setComment] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const submitComment = () => {
    if (!comment.trim()) return;
    addComment.mutate({ id: taskId, body: comment.trim() }, {
      onSuccess: () => setComment(''),
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate({ id: taskId, file }, {
      onSuccess: () => toast.success('Fayl yuklandi'),
      onError: (er) => toast.error(apiError(er)),
    });
  };

  const doCheck = () => {
    review.mutate({ id: taskId, verdict: 'checked' }, {
      onSuccess: () => { toast.success('Vazifa tasdiqlandi (Checked)'); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const doReject = () => {
    if (!rejectReason.trim()) { toast.error('Izoh majburiy'); return; }
    review.mutate({ id: taskId, verdict: 'rejected', comment: rejectReason.trim() }, {
      onSuccess: () => { toast.success('Rad etildi — vazifa qayta ishlashga qaytdi'); setRejectOpen(false); setRejectReason(''); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const dl = task?.deadline ? deadlineInfo(task.deadline) : null;

  return (
    <>
      <Dialog open={open} onClose={onClose} size="lg" title={isLoading ? 'Yuklanmoqda...' : task?.title}>
        {isLoading || !task ? (
          <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /></div>
        ) : (
          <div className="space-y-5">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TASK_STATUS[task.status]?.tone}>{TASK_STATUS[task.status]?.label}</Badge>
              <Badge tone={TASK_PRIORITY[task.priority]?.tone}>{TASK_PRIORITY[task.priority]?.label}</Badge>
              <span className="rounded bg-bg-2 px-2 py-0.5 text-xs text-text-sub">{TASK_TYPE[task.type]}</span>
              {task.reopenedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-error-soft px-2 py-0.5 text-xs text-error-strong">
                  <RotateCcw className="h-3 w-3" /> {task.reopenedCount} marta qaytarilgan
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Mas'ul" value={task.assignee?.fullName} />
              <Meta label="Lavozim" value={task.position?.name} />
              <Meta label="Deadline" value={task.deadline ? `${formatDate(task.deadline)} (${dl?.text})` : '—'} valueClass={dl?.overdue ? 'text-error-strong' : ''} />
              <Meta label="Loyiha" value={task.project?.name} />
            </div>

            {task.description && (
              <div>
                <p className="mb-1 text-xs font-medium text-text-soft">Tavsif</p>
                <p className="whitespace-pre-wrap rounded-lg bg-bg-1 p-3 text-sm text-text-sub">{task.description}</p>
              </div>
            )}

            {task.rejectReason && (
              <div className="rounded-lg border border-error-disabled bg-error-soft p-3">
                <p className="text-xs font-medium text-error-strong">So'nggi rad etish sababi</p>
                <p className="mt-0.5 text-sm text-error-strong">{task.rejectReason}</p>
              </div>
            )}

            {/* Files */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-text-soft">Fayllar ({task.files?.length || 0})</p>
                <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-text-accent hover:underline">
                  <Paperclip className="h-3.5 w-3.5" /> Yuklash
                  <input type="file" className="hidden" onChange={onFile} disabled={uploadFile.isPending} />
                </label>
              </div>
              <div className="space-y-1">
                {(task.files || []).map((f) => (
                  <a key={f.id} href={`${API_BASE}${f.fileUrl}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between rounded-md border border-stroke-soft px-3 py-2 text-sm hover:bg-bg-1-alt">
                    <span className="truncate text-text-strong">{f.fileName}</span>
                    <Download className="h-4 w-4 shrink-0 text-icon-soft" />
                  </a>
                ))}
                {!task.files?.length && <p className="text-xs text-text-soft">Fayl yo'q</p>}
              </div>
            </div>

            {/* Comments */}
            <div>
              <p className="mb-2 text-xs font-medium text-text-soft">Izohlar ({task.comments?.length || 0})</p>
              <div className="mb-3 space-y-3">
                {(task.comments || []).map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.user?.fullName} src={c.user?.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-strong">{c.user?.fullName}</span>
                        <span className="text-xs text-text-soft">{fromNow(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-text-sub">{c.body}</p>
                    </div>
                  </div>
                ))}
                {!task.comments?.length && <p className="text-xs text-text-soft">Izoh yo'q</p>}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Izoh yozing..." value={comment} onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
                <Button size="icon" onClick={submitComment} loading={addComment.isPending}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {task && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-stroke-sub pt-4">
            <div className="flex gap-2">
              {canManage && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(task)}><Pencil className="h-4 w-4" /> Tahrirlash</Button>
                  <Button variant="ghost" size="sm" className="text-error-strong" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /> O'chirish</Button>
                </>
              )}
            </div>
            {canReview && task.status === 'done' && (
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}><XCircle className="h-4 w-4" /> Rad etish</Button>
                <Button size="sm" onClick={doCheck} loading={review.isPending}><CheckCircle2 className="h-4 w-4" /> Tasdiqlash</Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Vazifani rad etish"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Bekor</Button>
            <Button variant="danger" onClick={doReject} loading={review.isPending}>Rad etish</Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-text-sub">Izoh majburiy. Vazifa avtomatik "Jarayonda"ga qaytadi.</p>
        <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Nima qayta qilinishi kerak?" />
      </Dialog>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={() => del.mutate(taskId, { onSuccess: () => { toast.success('O\'chirildi'); setConfirmDel(false); onClose(); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message="Bu vazifani o'chirmoqchimisiz?"
      />
    </>
  );
}

function Meta({ label, value, valueClass = '' }) {
  return (
    <div>
      <p className="text-xs text-text-soft">{label}</p>
      <p className={`text-text-strong ${valueClass}`}>{value || '—'}</p>
    </div>
  );
}
