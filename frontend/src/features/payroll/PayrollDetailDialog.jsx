import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { MONTHS_UZ } from '@/lib/constants';
import { usePayManyPayrolls } from './payrollApi';

const monthName = (m) => (m && /^\d{4}-\d{2}$/.test(m) ? MONTHS_UZ[Number(m.slice(5, 7)) - 1] : m || '—');

function Field({ label, value, valueClass }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-text-sub">{label}</p>
      <div className={cn('flex min-h-10 w-full items-center justify-end rounded-md border border-stroke-strong bg-bg-base px-3 py-2 text-sm font-medium text-text-strong', valueClass)}>
        {value}
      </div>
    </div>
  );
}

/** "Ish haqi ma'lumotlari" — o'qiladigan ko'rinish; buxgalter "Tasdiqlash" qila oladi. */
export function PayrollDetailDialog({ open, onClose, payroll, canManage }) {
  const payMany = usePayManyPayrolls();
  const [confirming, setConfirming] = useState(false);
  if (!payroll) return null;

  const u = payroll.user || {};
  const canApprove = canManage && ['draft', 'ready'].includes(payroll.status);

  const doApprove = () => {
    payMany.mutate([payroll.id], {
      onSuccess: () => { toast.success("To'lovlar tasdiqlandi", { description: 'Tanlangan to\'lov muvaffaqiyatli tasdiqlandi' }); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  if (confirming) {
    return (
      <Dialog open={open} onClose={onClose} onBack={() => setConfirming(false)} title="Ish haqini tasdiqlaysizmi?" subtitle="Tasdiqlangandan so'ng, bu amalni bekor qilib bo'lmaydi." size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}><X className="h-4 w-4" /> Bekor qilish</Button>
            <Button className="bg-success-strong hover:bg-success-sub" onClick={doApprove} loading={payMany.isPending}><Check className="h-4 w-4" /> Tasdiqlash</Button>
          </div>
        }
      ><div /></Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} onBack={onClose} title="Ish haqi ma'lumotlari" size="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Bekor qilish</Button>
          {canApprove && <Button className="bg-success-strong hover:bg-success-sub" onClick={() => setConfirming(true)}><Check className="h-4 w-4" /> Tasdiqlash</Button>}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={u.fullName} src={u.avatar} size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-text-strong">{u.fullName}</h3>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="rounded-md bg-bg-1-alt px-2.5 py-1 text-xs text-text-sub">Viloyat: <b className="text-text-strong">{u.region || '—'}</b></span>
              <span className="rounded-md bg-bg-1-alt px-2.5 py-1 text-xs text-text-sub">Tuman: <b className="text-text-strong">{u.district || '—'}</b></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lavozimi" value={<span className="w-full text-left font-normal">{u.position?.name || '—'}</span>} valueClass="justify-start" />
          <div>
            <p className="mb-1.5 text-sm text-text-sub">Passport ma'lumotlari</p>
            <div className="flex gap-2">
              <div className="flex h-10 w-16 items-center justify-center rounded-md border border-stroke-strong bg-bg-base text-sm font-medium text-text-strong">{u.passportSeries || '—'}</div>
              <div className="flex h-10 flex-1 items-center rounded-md border border-stroke-strong bg-bg-base px-3 text-sm font-medium text-text-strong">{u.passportNumber || '—'}</div>
            </div>
          </div>
          <Field label="Oylik maosh (UZS)" value={formatMoney(payroll.fixedAmount)} />
          <Field label="Loyiha ulushi (UZS)" value={formatMoney(payroll.projectShareTotal)} />
          <Field label="KPI bonus (UZS)" value={formatMoney(payroll.kpiBonus)} />
          <Field label="Yaratilgan vaqti" value={<span className="w-full text-left font-normal">{formatDate(payroll.createdAt, true)}</span>} valueClass="justify-start" />
          <Field label="Oy" value={<span className="w-full text-left font-normal">{monthName(payroll.month)}</span>} valueClass="justify-start" />
          <Field label="Jarima miqdori (UZS)" value={payroll.penalty && Number(payroll.penalty) > 0 ? `−${formatMoney(payroll.penalty)}` : formatMoney(0)} valueClass={Number(payroll.penalty) > 0 ? 'text-error-strong' : ''} />
          <Field label="Jami miqdori (UZS)" value={formatMoney(payroll.total)} />
        </div>
      </div>
    </Dialog>
  );
}
