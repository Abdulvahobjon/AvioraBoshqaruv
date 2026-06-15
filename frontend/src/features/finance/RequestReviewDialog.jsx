import { useEffect, useState } from 'react';
import { X, Check, XCircle, FileText, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { formatMoney } from '@/lib/utils/format';
import { FINANCE_TYPE, PAYMENT_METHOD } from '@/lib/constants';
import { usePayRequest, useRejectRequest, useConfirmRequest, useUploadReceipt } from './financeApi';

const fileUrl = (u) => (u?.startsWith('http') ? u : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${u}`);

/** O'qiladigan maydon (Figma'dagi to'ldirilmaydigan input ko'rinishi). */
function ReadField({ label, value, className }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm text-text-sub">{label}</p>
      <div className="flex min-h-10 w-full items-center rounded-md border border-stroke-strong bg-bg-base px-3 py-2 text-sm text-text-strong">
        {value || '—'}
      </div>
    </div>
  );
}

/** O'qiladigan maydon — butun qutini bosib qiymatni nusxalash mumkin (masalan karta raqami). */
function CopyField({ label, value, className }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard?.writeText(String(value));
    setCopied(true);
    toast.success('Nusxalandi');
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm text-text-sub">{label}</p>
      <button
        type="button"
        onClick={onCopy}
        title="Nusxalash uchun bosing"
        className="group flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-stroke-strong bg-bg-base px-3 py-2 text-left text-sm tracking-wide text-text-strong transition-colors hover:border-stroke-accent"
      >
        <span>{value}</span>
        {copied
          ? <Check className="h-4 w-4 shrink-0 text-success-strong" />
          : <Copy className="h-4 w-4 shrink-0 text-icon-soft transition-colors group-hover:text-text-accent" />}
      </button>
    </div>
  );
}

/**
 * "Xarajat so'rovi" — buxgalter ko'rib chiqadi (To'lov qildim / Rad etish),
 * yoki egasi to'langanini tasdiqlaydi, yoki yopilgan so'rov o'qiladi (chek bilan).
 */
export function RequestReviewDialog({ open, onClose, request, canProcess, isOwner }) {
  const [step, setStep] = useState('review'); // review | payConfirm | receipts | reject
  const pay = usePayRequest();
  const reject = useRejectRequest();
  const confirm = useConfirmRequest();

  useEffect(() => { if (open) setStep('review'); }, [open, request?.id]);
  if (!request) return null;

  const isPending = request.status === 'pending';
  const isPaid = request.status === 'paid';
  const canReview = canProcess && isPending;
  const canConfirm = isOwner && isPaid;

  const doReject = (reason) => {
    reject.mutate({ id: request.id, cancelReason: reason }, {
      onSuccess: () => { toast.success("So'rov rad etildi", { description: "So'rov bo'yicha rad etish sababi saqlandi" }); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const doPay = (receipts) => {
    pay.mutate({ id: request.id, paymentMethod: request.paymentMethod || undefined, receipts }, {
      onSuccess: () => { toast.success("To'lov qayd etildi", { description: "Mablag' berilgani tizimda belgilandi" }); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const doConfirm = () => {
    confirm.mutate(request.id, {
      onSuccess: () => { toast.success('Tasdiqlandi', { description: "To'lovni qabul qilganingiz qayd etildi" }); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  // ── Step: to'lovni tasdiqlash ──
  if (step === 'payConfirm') {
    return (
      <Dialog open={open} onClose={onClose} onBack={() => setStep('review')} title="To'lov amalga oshirilganini tasdiqlaysizmi?" subtitle="Bu orqali to'lov amalga oshirilgani tizimda qayd etiladi." size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep('review')}><X className="h-4 w-4" /> Bekor qilish</Button>
            <Button className="bg-success-strong hover:bg-success-sub" onClick={() => setStep('receipts')}><Check className="h-4 w-4" /> Tasdiqlash</Button>
          </div>
        }
      ><div /></Dialog>
    );
  }

  // ── Step: chek yuklash ──
  if (step === 'receipts') {
    return <ReceiptStep open={open} onClose={onClose} onBack={() => setStep('payConfirm')} onSubmit={doPay} loading={pay.isPending} />;
  }

  // ── Step: rad etish sababi ──
  if (step === 'reject') {
    return <RejectStep open={open} onClose={onClose} onBack={() => setStep('review')} onReject={doReject} loading={reject.isPending} />;
  }

  // ── Step: ko'rib chiqish (asosiy) ──
  const footer = canReview ? (
    <div className="flex w-full items-center justify-end gap-2">
      <Button className="bg-error-strong hover:bg-error-sub" onClick={() => setStep('reject')}><XCircle className="h-4 w-4" /> Rad etish</Button>
      <Button onClick={() => setStep('payConfirm')}><Check className="h-4 w-4" /> To'lov qildim</Button>
    </div>
  ) : canConfirm ? (
    <div className="flex w-full items-center justify-end gap-2">
      <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button>
      <Button className="bg-success-strong hover:bg-success-sub" onClick={doConfirm} loading={confirm.isPending}><Check className="h-4 w-4" /> Tasdiqlash</Button>
    </div>
  ) : (
    <div className="flex w-full items-center justify-end">
      <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} onBack={onClose} title="Xarajat so'rovi" subtitle="Ma'lumotlarni tekshirib, so'rov bo'yicha qaror qabul qiling" size="lg" footer={footer}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadField label="Xarajat turi" value={FINANCE_TYPE[request.type]} />
          <ReadField label="Toifa" value={request.category?.name} />
        </div>
        <ReadField label="Miqdori (UZS)" value={formatMoney(request.amount, request.currency)} />
        <ReadField label="Sababi" value={request.reason} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadField label="To'lov turi" value={request.paymentMethod ? PAYMENT_METHOD[request.paymentMethod] : '—'} />
          {request.card && <CopyField label="Karta raqam" value={request.card} />}
        </div>

        {!!request.receipts?.length && (
          <div>
            <p className="mb-1.5 text-sm text-text-sub">To'lov cheki</p>
            <div className="grid grid-cols-3 gap-3">
              {request.receipts.map((r, i) => (
                <a key={i} href={fileUrl(r)} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden rounded-xl border border-stroke-sub">
                  <img src={fileUrl(r)} alt={`Chek ${i + 1}`} className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {request.status === 'rejected' && request.cancelReason && (
          <div className="rounded-lg border border-error-soft bg-error-soft/40 px-3 py-2.5">
            <p className="text-xs font-medium text-error-strong">Rad etish sababi</p>
            <p className="mt-0.5 text-sm text-text-sub">{request.cancelReason}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** "To'lov cheki yuklang" — 0-3 ta chek; yuborish yoki o'tkazib yuborish. */
function ReceiptStep({ open, onClose, onBack, onSubmit, loading }) {
  const [files, setFiles] = useState([]); // { url, uploading }
  const upload = useUploadReceipt();

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || files.length >= 3) return;
    const idx = files.length;
    setFiles((s) => [...s, { url: '', uploading: true }]);
    try {
      const { url } = await upload.mutateAsync(f);
      setFiles((s) => s.map((x, i) => (i === idx ? { url, uploading: false } : x)));
    } catch (err) {
      toast.error(apiError(err, 'Fayl yuklanmadi'));
      setFiles((s) => s.filter((_, i) => i !== idx));
    }
  };

  const remove = (i) => setFiles((s) => s.filter((_, idx) => idx !== i));
  const urls = files.filter((f) => f.url).map((f) => f.url);
  const busy = files.some((f) => f.uploading);
  const tiles = files.length < 3 ? files.length + 1 : 3;

  return (
    <Dialog open={open} onClose={onClose} onBack={onBack} title="To'lov chekini yuklang." subtitle="To'lov tasdiqlanishi uchun chek yoki kvitansiyani yuklang." size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onSubmit([])} disabled={loading}>O'tkazib yuborish</Button>
          <Button onClick={() => onSubmit(urls)} loading={loading} disabled={busy}>Yuborish</Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: tiles }).map((_, i) => {
          const f = files[i];
          if (f) {
            return (
              <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-stroke-sub bg-bg-1">
                {f.uploading ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-icon-soft" /></div>
                ) : (
                  <img src={fileUrl(f.url)} alt={`Chek ${i + 1}`} className="h-full w-full object-cover" />
                )}
                {!f.uploading && (
                  <button onClick={() => remove(i)} className="absolute right-1.5 top-1.5 rounded-full bg-error-strong p-1 text-white shadow" aria-label="O'chirish">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          }
          return (
            <label key={i} className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stroke-strong bg-bg-1 text-center transition-colors hover:border-stroke-accent">
              <FileText className="h-7 w-7 text-icon-soft" />
              <span className="px-2 text-sm text-text-sub">Ta'lov chekini yuklang</span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}

/** "Rad etish sababini kiriting" — majburiy sabab. */
function RejectStep({ open, onClose, onBack, onReject, loading }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} onBack={onBack} title="Rad etish sababini kiriting" size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onBack}><X className="h-4 w-4" /> Bekor qilish</Button>
          <Button className="bg-error-strong hover:bg-error-sub" onClick={() => reason.trim() ? onReject(reason.trim()) : toast.error('Sababni yozing')} loading={loading}>
            <XCircle className="h-4 w-4" /> Rad etish
          </Button>
        </div>
      }
    >
      <FormField label="Sababi" required>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Iltimos, sababni yozing. Bu majburiy" />
      </FormField>
    </Dialog>
  );
}
