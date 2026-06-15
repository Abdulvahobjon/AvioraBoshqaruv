import { useState } from 'react';
import { Search, Filter, RefreshCw, Check, X, CheckSquare, Info } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AntDate } from '@/components/ui/AntDate';
import { cn } from '@/lib/utils/cn';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { MONTHS_UZ } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { usePayrolls, useGeneratePayroll, usePayManyPayrolls } from '@/features/payroll/payrollApi';
import { PayrollDetailDialog } from '@/features/payroll/PayrollDetailDialog';
import { PayrollFilterDialog } from '@/features/payroll/PayrollFilterDialog';

const monthName = (m) => (m && /^\d{4}-\d{2}$/.test(m) ? MONTHS_UZ[Number(m.slice(5, 7)) - 1] : m || '—');
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const isApproved = (p) => ['paid', 'closed'].includes(p.status);
const isSelectable = (p) => ['draft', 'ready'].includes(p.status);

function CheckBox({ checked, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
        disabled ? 'cursor-not-allowed border-stroke-sub bg-bg-2' : checked ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong bg-bg-base hover:border-stroke-accent',
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

export function PayrollPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = can(role, 'payroll.manage');

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [month, setMonth] = useState(currentMonth());

  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const hasFilters = Object.keys(activeFilters).length > 0;

  const { data, isLoading } = usePayrolls({ search: debounced || undefined, ...activeFilters });
  const rows = data || [];
  const generate = useGeneratePayroll();
  const payMany = usePayManyPayrolls();

  const selectableRows = rows.filter(isSelectable);
  const allPicked = selectableRows.length > 0 && selectableRows.every((r) => picked.has(r.id));

  const toggleOne = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(selectableRows.map((r) => r.id)));
  const exitSelect = () => { setSelectMode(false); setPicked(new Set()); };

  const doGenerate = () => generate.mutate(month, {
    onSuccess: () => toast.success('Ish haqi hisoblandi', { description: `${monthName(month)} oyi uchun` }),
    onError: (e) => toast.error(apiError(e)),
  });

  const doApprove = () => {
    payMany.mutate([...picked], {
      onSuccess: (r) => { toast.success("To'lovlar tasdiqlandi", { description: `Tanlangan barcha to'lovlar muvaffaqiyatli tasdiqlandi` }); setConfirmOpen(false); exitSelect(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  const columns = [
    ...(selectMode && canManage ? [{
      key: 'pick',
      header: <CheckBox checked={allPicked} onClick={toggleAll} disabled={!selectableRows.length} />,
      render: (r) => isSelectable(r) ? <CheckBox checked={picked.has(r.id)} onClick={() => toggleOne(r.id)} /> : <span className="inline-block h-5 w-5" />,
      className: 'w-10',
    }] : []),
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'user', header: 'Ism sharifi', render: (r) => <span className="font-medium text-text-strong">{r.user?.fullName || '—'}</span> },
    { key: 'month', header: 'Oy', render: (r) => <span className="text-text-sub">{monthName(r.month)}</span> },
    { key: 'fixed', header: 'Oylik maosh (UZS)', render: (r) => <span className="font-semibold text-text-strong">{formatMoney(r.fixedAmount)}</span> },
    { key: 'share', header: 'Loyiha ulushi (UZS)', render: (r) => <span className="text-text-sub">{formatMoney(r.projectShareTotal)}</span> },
    { key: 'kpi', header: 'KPI bonus (UZS)', render: (r) => <span className="text-text-sub">{formatMoney(r.kpiBonus)}</span> },
    { key: 'penalty', header: 'Jarima miqdori (UZS)', render: (r) => Number(r.penalty) > 0 ? <span className="font-medium text-error-strong">−{formatMoney(r.penalty)}</span> : <span className="text-text-soft">{formatMoney(0)}</span> },
    { key: 'total', header: 'Jami miqdori (UZS)', render: (r) => <span className="font-semibold text-text-strong">{formatMoney(r.total)}</span> },
    { key: 'createdAt', header: 'Yaratilgan vaqt', render: (r) => <span className="whitespace-nowrap text-text-sub">{formatDate(r.createdAt)}</span> },
    {
      key: 'approved', header: 'Tasdiqlash',
      render: (r) => isApproved(r)
        ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success-strong text-text-white"><Check className="h-4 w-4" /></span>
        : <span className="inline-block h-6 w-6 rounded-md border border-stroke-sub bg-bg-2" />,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Ish haqi"
        actions={
          <div className="flex items-center gap-2">
            {canManage && !selectMode && (
              <>
                <div className="w-36"><AntDate value={month} onChange={(v) => v && setMonth(v)} picker="month" allowClear={false} /></div>
                <Button variant="outline" onClick={doGenerate} loading={generate.isPending}><RefreshCw className="h-4 w-4" /> Hisoblash</Button>
              </>
            )}
            {canManage && (
              selectMode
                ? <Button variant="outline" onClick={exitSelect}><X className="h-4 w-4" /> Bekor qilish</Button>
                : <Button variant="outline" onClick={() => setSelectMode(true)}><CheckSquare className="h-4 w-4" /> Tanlash</Button>
            )}
            <button
              type="button"
              title="Tasdiqlash orqali ish haqi yakuniy hisob bo'yicha hisoblanadi. Ish haqi har oyning 4-sanasidan boshlab tasdiqlanadi."
              className="flex h-9 w-9 items-center justify-center rounded-full text-icon-soft hover:bg-bg-1-alt hover:text-icon-strong"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Ism Sharifi bo'yicha izlash" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)} className={cn('relative', hasFilters && 'border-stroke-accent text-text-accent')}>
          <Filter className="h-4 w-4" /> Filtrlash
          {hasFilters && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-strong" />}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          onRowClick={selectMode ? undefined : (r) => setDetail(r)}
          emptyTitle="Ish haqi ma'lumotlari yo'q"
          emptyDescription={canManage ? "Oyni tanlab 'Hisoblash' tugmasini bosing." : "Sizning ish haqingiz bu yerda ko'rinadi."}
          transparent
          fill
        />
      </div>

      {/* Tanlangan to'lovlarni tasdiqlash — pastdagi suzuvchi tugma */}
      {selectMode && picked.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <button
            onClick={() => setConfirmOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-stroke-sub bg-bg-base px-6 py-3 text-sm font-semibold text-success-strong shadow-elevated transition-transform hover:scale-[1.02]"
          >
            <Check className="h-4 w-4" /> Tasdiqlash ({picked.size})
          </button>
        </div>
      )}

      <PayrollDetailDialog open={!!detail} onClose={() => setDetail(null)} payroll={detail} canManage={canManage} />
      <PayrollFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onBack={() => setConfirmOpen(false)}
        title="Ish haqini tasdiqlaysizmi?"
        subtitle="Tasdiqlangandan so'ng, bu amalni bekor qilib bo'lmaydi."
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}><X className="h-4 w-4" /> Bekor qilish</Button>
            <Button className="bg-success-strong hover:bg-success-sub" onClick={doApprove} loading={payMany.isPending}><Check className="h-4 w-4" /> Tasdiqlash</Button>
          </div>
        }
      ><div /></Dialog>
    </div>
  );
}
