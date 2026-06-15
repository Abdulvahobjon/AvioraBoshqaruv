import { useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, Send, CheckCircle2, XCircle, Download, RotateCcw, ImagePlus, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { TASK_STATUS, TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { formatDate, formatMoney, fromNow, deadlineInfo } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useCan } from '@/lib/permissions';
import { useTask, useAddComment, useUploadFile, useReviewTask, useUploadImage } from './tasksApi';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** estimatedMinutes → "4s", "1s 30d", "45d". */
function formatEstimate(min) {
  if (!min && min !== 0) return null;
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}s ${m}d`;
  if (h) return `${h}s`;
  return `${m}d`;
}

/** Faqat o'qish maydoni — tahrirlash formasidagi kabi, lekin o'zgartirib bo'lmaydi. */
function ReadField({ label, value, className = '', multiline = false, valueClass = '' }) {
  return (
    <FormField label={label} className={className}>
      <div
        className={
          'w-full rounded-lg border border-stroke-soft bg-bg-1 px-3 py-2 text-sm text-text-strong ' +
          (multiline ? 'min-h-[5rem] whitespace-pre-wrap' : 'min-h-[2.5rem] truncate') +
          (valueClass ? ` ${valueClass}` : '')
        }
        title={!multiline && typeof value === 'string' ? value : undefined}
      >
        {value || value === 0 ? value : '—'}
      </div>
    </FormField>
  );
}

// Faqat o'qish/ko'rish oynasi: vazifa maydonlari tahrirlanmaydi (ular Tahrirlash modalida).
// Bu oyna ma'lumotni ko'rish, izoh yozish, fayl yuklash va menejer tekshiruvi uchun.
export function TaskDetailDialog({ taskId, open, onClose }) {
  const { data: task, isLoading } = useTask(taskId);
  const can = useCan();
  const canWork = can('tasks.work'); // izoh/fayl — auditor (faqat-o'qish) uchun yashiriladi
  const addComment = useAddComment();
  const uploadFile = useUploadFile();
  const review = useReviewTask();
  const uploadImage = useUploadImage();

  const [comment, setComment] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPhoto, setRejectPhoto] = useState(null);
  const [rejectPhotoPreview, setRejectPhotoPreview] = useState('');

  const submitComment = () => {
    if (!comment.trim() || addComment.isPending) return;
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
      onSuccess: () => toast.success('Vazifa tasdiqlandi (Checked)'),
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const closeReject = () => {
    setRejectOpen(false);
    setRejectReason('');
    if (rejectPhotoPreview) URL.revokeObjectURL(rejectPhotoPreview);
    setRejectPhoto(null);
    setRejectPhotoPreview('');
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Faqat rasm yuklash mumkin'); return; }
    if (rejectPhotoPreview) URL.revokeObjectURL(rejectPhotoPreview);
    setRejectPhoto(file);
    setRejectPhotoPreview(URL.createObjectURL(file));
  };

  const doReject = async () => {
    if (!rejectReason.trim()) { toast.error('Izoh majburiy'); return; }
    try {
      let photoUrl;
      if (rejectPhoto) photoUrl = await uploadImage.mutateAsync(rejectPhoto);
      await review.mutateAsync({ id: taskId, verdict: 'rejected', comment: rejectReason.trim(), photoUrl });
      toast.success('Rad etildi — vazifa qayta ishlashga qaytdi');
      closeReject();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const rejecting = review.isPending || uploadImage.isPending;

  const dl = task?.deadline ? deadlineInfo(task.deadline) : null;
  const deadlineText = task?.deadline ? `${formatDate(task.deadline, true)}${dl?.text ? ` (${dl.text})` : ''}` : null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        onBack={onClose}
        title="Vazifa ma'lumotlari"
        subtitle="Vazifa haqida batafsil ma'lumot"
        size="lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {/* canReview backendda hisoblanadi: status='production' + tekshiruvchi/admin */}
              {task?.canReview && (
                <>
                  <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}><XCircle className="h-4 w-4" /> Rad etish</Button>
                  <Button size="sm" onClick={doCheck} loading={review.isPending}><CheckCircle2 className="h-4 w-4" /> Tasdiqlash</Button>
                </>
              )}
            </div>
            <Button variant="ghost" onClick={onClose}>Yopish</Button>
          </div>
        }
      >
        {isLoading || !task ? (
          <div className="space-y-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /></div>
        ) : (
          <div className="space-y-5">
            {/* Read-only forma maydonlari (tahrirlash formasidagi tartib) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadField label="Loyiha" value={task.project?.name} />
              <ReadField label="Nomi" value={task.title} />
              <ReadField label="Tavsifi" value={task.description} className="sm:col-span-2" multiline />

              <ReadField label="Holati" value={TASK_STATUS[task.status]?.label} />
              <ReadField label="Darajasi" value={TASK_PRIORITY[task.priority]?.label} />
              <ReadField label="Turi" value={TASK_TYPE[task.type]} className="sm:col-span-2" />

              <ReadField label="Topshiruvchi (mas'ul xodim)" value={task.assignee?.fullName} className="sm:col-span-2" />
              <ReadField label="Lavozim" value={task.position?.name} />
              <ReadField label="Sprint tartib raqami" value={task.sprint} />

              <ReadField label="Vazifa narxi" value={formatMoney(task.price)} />
              <ReadField label="Jarima foizi" value={task.penaltyPercent != null ? `${task.penaltyPercent}%` : null} />

              <ReadField label="Muddati" value={deadlineText} valueClass={dl?.overdue ? 'text-error-strong' : ''} />
              <ReadField label="Taxminiy vaqt" value={formatEstimate(task.estimatedMinutes)} />
            </div>

            {task.reopenedCount > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-1.5 text-xs font-medium text-warning-strong">
                <RotateCcw className="h-3.5 w-3.5" /> {task.reopenedCount} marta qaytarilgan
              </div>
            )}

            {(task.rejectReason || task.rejectPhotoUrl) && (
              <div className="rounded-lg border border-error-disabled bg-error-soft p-3">
                <p className="text-xs font-medium text-error-strong">So'nggi rad etish sababi</p>
                {task.rejectPhotoUrl && (
                  <a href={`${API_BASE}${task.rejectPhotoUrl}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-block">
                    <img src={`${API_BASE}${task.rejectPhotoUrl}`} alt="Rad etish dalili" className="h-28 w-28 rounded-lg border border-error-disabled object-cover" />
                  </a>
                )}
                {task.rejectReason && <p className="mt-1 text-sm text-error-strong">{task.rejectReason}</p>}
              </div>
            )}

            {/* Fayllar */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-text-soft">Fayllar ({task.files?.length || 0})</p>
                {canWork && (
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-text-accent hover:underline">
                    <Paperclip className="h-3.5 w-3.5" /> Yuklash
                    <input type="file" className="hidden" onChange={onFile} disabled={uploadFile.isPending} />
                  </label>
                )}
              </div>
              <div className="space-y-1">
                {(task.files || []).map((f) => {
                  const src = `${API_BASE}${f.fileUrl}`;
                  const isImg = /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.fileName || f.fileUrl || '');
                  return (
                    <a key={f.id} href={src} target="_blank" rel="noreferrer" title="Ochib ko'rish"
                      className="flex items-center gap-2 rounded-md border border-stroke-soft px-3 py-2 text-sm hover:bg-bg-1-alt">
                      {isImg && <img src={src} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />}
                      <span className="min-w-0 flex-1 truncate text-text-strong">{f.fileName}</span>
                      <Download className="h-4 w-4 shrink-0 text-icon-soft" />
                    </a>
                  );
                })}
                {!task.files?.length && <p className="text-xs text-text-soft">Fayl yo'q</p>}
              </div>
            </div>

            {/* Izohlar */}
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
              {canWork && (
                <div className="flex gap-2">
                  <Input placeholder="Izoh yozing..." value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
                  <Button size="icon" onClick={submitComment} loading={addComment.isPending}><Send className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Rad etish: sabab matni (majburiy) + rasm (ixtiyoriy) */}
      <Dialog
        open={rejectOpen}
        onClose={closeReject}
        title="Vazifani rad etish"
        subtitle="Rad etish sababini kiriting"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeReject}>Bekor</Button>
            <Button variant="danger" onClick={doReject} loading={rejecting}>Rad etish</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-text-sub">Izoh majburiy. Vazifa avtomatik "Jarayonda"ga qaytadi.</p>
        <div className="mb-3">
          {rejectPhotoPreview ? (
            <div className="relative inline-block">
              <img src={rejectPhotoPreview} alt="Dalil" className="h-28 w-28 rounded-lg object-cover" />
              <button type="button" onClick={() => { URL.revokeObjectURL(rejectPhotoPreview); setRejectPhoto(null); setRejectPhotoPreview(''); }}
                className="absolute -right-2 -top-2 rounded-full bg-error-strong p-1 text-text-white shadow-card" aria-label="Rasmni olib tashlash">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="inline-flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stroke-sub text-xs text-text-soft hover:bg-bg-1-alt">
              <ImagePlus className="h-5 w-5" /> Rasm qo'shish
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
          )}
        </div>
        <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Sababini yozing..." />
      </Dialog>
    </>
  );
}
