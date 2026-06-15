import { X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatDate } from '@/lib/utils/format';

const LEDGER_TYPE = { salary: 'Oylik', company: 'Kompaniya', other: 'Boshqa', project_share: 'Loyiha ulushi', withdrawal: 'Yechib olish', reversal: 'Teskari yozuv' };

function Field({ label, value, align = 'end', mono }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-text-sub">{label}</p>
      <div className={cn('flex min-h-10 w-full items-center rounded-md border border-stroke-strong bg-bg-base px-3 py-2 text-sm text-text-strong', align === 'end' ? 'justify-end font-medium' : 'justify-start', mono && 'font-medium')}>
        {value}
      </div>
    </div>
  );
}

/** "Tarix ma'lumotlari" — ledger yozuvi (o'qish). */
export function HistoryDetailDialog({ open, onClose, entry }) {
  if (!entry) return null;
  const u = entry.user || {};
  const xarajat = entry.request?.category?.name || LEDGER_TYPE[entry.type] || entry.type;

  return (
    <Dialog open={open} onClose={onClose} onBack={onClose} title="Tarix ma'lumotlari" size="lg"
      footer={<div className="flex w-full justify-end"><Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button></div>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={u.fullName} src={u.avatar} size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-text-strong">{u.fullName || '—'}</h3>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <span className="rounded-md bg-bg-1-alt px-2.5 py-1 text-xs text-text-sub">Viloyat: <b className="text-text-strong">{u.region || '—'}</b></span>
              <span className="rounded-md bg-bg-1-alt px-2.5 py-1 text-xs text-text-sub">Tuman: <b className="text-text-strong">{u.district || '—'}</b></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lavozimi" value={u.position?.name || '—'} align="start" />
          <div>
            <p className="mb-1.5 text-sm text-text-sub">Passport ma'lumotlari</p>
            <div className="flex gap-2">
              <div className="flex h-10 w-16 items-center justify-center rounded-md border border-stroke-strong bg-bg-base text-sm font-medium text-text-strong">{u.passportSeries || '—'}</div>
              <div className="flex h-10 flex-1 items-center rounded-md border border-stroke-strong bg-bg-base px-3 text-sm font-medium text-text-strong">{u.passportNumber || '—'}</div>
            </div>
          </div>
          <Field label="Xarajat" value={xarajat} align="start" />
          <Field label="Turi" value={entry.direction === 'credit' ? 'Kirim' : 'Chiqim'} align="start" />
          <Field label="Oylik maosh (UZS)" value={formatMoney(u.fixedSalary)} />
          <Field label="Sana" value={formatDate(entry.createdAt, true)} align="start" />
          <Field label="Miqdor (UZS)" value={formatMoney(entry.amount)} />
        </div>
      </div>
    </Dialog>
  );
}
