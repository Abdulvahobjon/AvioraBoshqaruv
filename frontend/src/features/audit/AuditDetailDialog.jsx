import { ShieldAlert } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { AUDIT_ACTION } from '@/lib/constants';
import { formatDate } from '@/lib/utils/format';

/** Faqat o'qish uchun maydon: yorliq + qiymat qutisi. */
function Field({ label, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-text-sub">{label}</span>
      <div className="flex min-h-10 items-center rounded-md border border-stroke-strong bg-bg-1 px-3 py-2 text-sm text-text-strong">
        {children ?? <span className="text-text-soft">—</span>}
      </div>
    </div>
  );
}

/** JSON qiymatini ko'rsatuvchi monospace quti. */
function JsonField({ label, value }) {
  const text = value != null ? JSON.stringify(value, null, 2) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-sub">{label}</span>
      <div className="rounded-md border border-stroke-strong bg-bg-1 p-3">
        {text ? (
          <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-text-sub">{text}</pre>
        ) : (
          <span className="text-sm text-text-soft">Ma'lumot yo'q</span>
        )}
      </div>
    </div>
  );
}

export function AuditDetailDialog({ open, onClose, log }) {
  if (!log) return null;
  const act = AUDIT_ACTION[log.action];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title="Foydalanuvchi va so'rov haqida ma'lumot"
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Yopish</Button>}
    >
      <div className="flex flex-col gap-4">
        {/* Foydalanuvchi */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-sub">Foydalanuvchi</span>
          <div className="flex items-center gap-3 rounded-md border border-stroke-strong bg-bg-1 px-3 py-2.5">
            <Avatar name={log.user?.fullName || 'Tizim'} size="sm" />
            <span className="text-sm font-medium text-text-strong">{log.user?.fullName || 'Tizim'}</span>
            {log.flagged && (
              <Badge tone="error" className="ml-auto gap-1"><ShieldAlert className="h-3 w-3" /> Shubhali</Badge>
            )}
          </div>
        </div>

        {/* Vaqti / IP */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vaqti">{formatDate(log.createdAt, true)}</Field>
          <Field label="IP manzili">{log.ip}</Field>
        </div>

        {/* Harakati / Jadval / Yozuv raqami */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Harakati">
            {act ? <Badge tone={act.tone}>{act.label}</Badge> : log.action}
          </Field>
          <Field label="Jadval nomi">{log.entity}</Field>
          <Field label="Yozuv raqami">{log.entityId}</Field>
        </div>

        {/* Eski / Yangi qiymat */}
        <JsonField label="Eski qiymat" value={log.oldValue} />
        <JsonField label="Yangi qiymat" value={log.newValue} />
      </div>
    </Dialog>
  );
}
