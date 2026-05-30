import { useState } from 'react';
import { RefreshCw, Send, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/utils/format';
import { PAYROLL_STATUS } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { usePayrolls, useGeneratePayroll, usePayrollAction } from '@/features/payroll/payrollApi';

function currentMonth() {
  // Avoid Date.now in app code paths is fine here (browser runtime)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function PayrollPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAccountant = ['accountant', 'admin', 'superadmin'].includes(role);
  const [month, setMonth] = useState(currentMonth());

  const { data, isLoading } = usePayrolls(isAccountant ? { month } : {});
  const generate = useGeneratePayroll();
  const action = usePayrollAction();

  const doAction = (id, act, msg) =>
    action.mutate({ id, action: act }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(apiError(e)) });

  const columns = [
    ...(isAccountant ? [{ key: 'user', header: 'Xodim', render: (r) => r.user?.fullName }] : [{ key: 'month', header: 'Oy', render: (r) => r.month }]),
    { key: 'fixedAmount', header: 'Fiks oylik', render: (r) => formatMoney(r.fixedAmount) },
    { key: 'projectShareTotal', header: 'Loyiha ulushi', render: (r) => formatMoney(r.projectShareTotal) },
    { key: 'total', header: 'Jami daromad', render: (r) => <span className="font-semibold">{formatMoney(r.total)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={PAYROLL_STATUS[r.status]?.tone}>{PAYROLL_STATUS[r.status]?.label}</Badge> },
    {
      key: 'actions', header: '',
      render: (r) => {
        if (isAccountant && r.status === 'draft') return <Button size="sm" variant="outline" onClick={() => doAction(r.id, 'ready', 'Tayyorlandi')}><ClipboardCheck className="h-4 w-4" /> Tayyorlash</Button>;
        if (isAccountant && r.status === 'ready') return <Button size="sm" onClick={() => doAction(r.id, 'pay', "To'landi")}><Send className="h-4 w-4" /> To'lash</Button>;
        if (!isAccountant && r.status === 'paid') return <Button size="sm" onClick={() => doAction(r.id, 'confirm', 'Tasdiqlandi')}><CheckCircle2 className="h-4 w-4" /> Tasdiqlash</Button>;
        return null;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Oyliklar"
        subtitle="Fiks oylik + loyiha ulushi"
        actions={
          isAccountant && (
            <div className="flex items-center gap-2">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
              <Button onClick={() => generate.mutate(month, { onSuccess: () => toast.success('Oylik hisoblandi'), onError: (e) => toast.error(apiError(e)) })} loading={generate.isPending}>
                <RefreshCw className="h-4 w-4" /> Hisoblash
              </Button>
            </div>
          )
        }
      />
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        emptyTitle="Oylik ma'lumotlari yo'q"
        emptyDescription={isAccountant ? "Oyni tanlab 'Hisoblash' tugmasini bosing." : "Sizning oyliklaringiz bu yerda ko'rinadi."}
      />
    </div>
  );
}
