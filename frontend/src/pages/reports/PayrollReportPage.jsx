import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { MONTHS_UZ } from '@/lib/constants';
import { useUsersList } from '@/features/users/usersApi';
import { usePayrollReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect, MoneyRange, UserPickerField, DateRange } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

const STATUS = [
  { value: 'draft', label: 'Hisoblangan', dot: '#9CA3AF' },
  { value: 'ready', label: "To'lovga tayyor", dot: '#F59E0B' },
  { value: 'paid', label: "To'langan", dot: '#22C55E' },
  { value: 'closed', label: 'Tasdiqlangan', dot: '#3B82F6' },
];
const statusLabel = (s) => STATUS.find((x) => x.value === s)?.label || s;

// "Oy uchun" variantlari — joriy va o'tgan yil oylari (YYYY-MM)
const MONTH_OPTS = (() => {
  const opts = [];
  const y = new Date().getFullYear();
  for (const year of [y, y - 1]) {
    for (let m = 0; m < 12; m++) opts.push({ value: `${year}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS_UZ[m]} ${year}` });
  }
  return opts;
})();
const monthLabel = (m) => (m && /^\d{4}-\d{2}$/.test(m) ? `${MONTHS_UZ[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : m || '—');

const EMPTY = {
  search: '',
  createdFrom: '', createdTo: '', confirmedFrom: '', confirmedTo: '',
  userIds: [], accountantIds: [], month: '', status: '',
  totalFrom: '', totalTo: '', fixedFrom: '', fixedTo: '',
  kpiFrom: '', kpiTo: '', penaltyFrom: '', penaltyTo: '',
};

function buildParams(f) {
  const p = {};
  const add = (k) => { if (f[k] !== '' && f[k] != null) p[k] = f[k]; };
  ['createdFrom', 'createdTo', 'confirmedFrom', 'confirmedTo', 'month', 'status',
    'totalFrom', 'totalTo', 'fixedFrom', 'fixedTo', 'kpiFrom', 'kpiTo', 'penaltyFrom', 'penaltyTo'].forEach(add);
  if (f.userIds?.length) p.userIds = f.userIds.join(',');
  if (f.accountantIds?.length) p.accountantIds = f.accountantIds.join(',');
  return p;
}

export function PayrollReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data: usersData } = useUsersList({ limit: 500 });
  const users = usersData?.items || [];
  const accountants = useMemo(
    () => users.filter((u) => u.role === 'accountant' || u.roles?.includes('accountant')),
    [users],
  );

  const { data, isFetching } = usePayrollReport(applied, generated);
  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.fullName?.toLowerCase().includes(q) || r.accountant?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const totals = generated ? data?.totals : null;

  const columns = [
    { key: 'fullName', header: 'Ism Sharifi' },
    { key: 'month', header: 'Oy', align: 'center', render: (r) => monthLabel(r.month) },
    { key: 'fixedAmount', header: 'Oylik maosh (UZS)', align: 'right', mono: true, render: (r) => money(r.fixedAmount) },
    { key: 'kpiBonus', header: 'KPI bonus (UZS)', align: 'right', mono: true, render: (r) => money(r.kpiBonus) },
    {
      key: 'penalty', header: 'Jarima miqdori (UZS)', align: 'right', mono: true,
      render: (r) => (r.penalty > 0 ? <span className="text-error-strong">−{money(r.penalty)}</span> : money(0)),
    },
    { key: 'total', header: 'Jami miqdori (UZS)', align: 'right', mono: true, render: (r) => money(r.total) },
    { key: 'status', header: 'Holati', align: 'center', render: (r) => statusLabel(r.status) },
    { key: 'createdAt', header: 'Hisoblangan vaqti', align: 'center', render: (r) => formatDate(r.createdAt) },
    { key: 'confirmedAt', header: 'Tasdiqlangan vaqti', align: 'center', render: (r) => formatDate(r.confirmedAt) },
    { key: 'accountant', header: 'Hisobchi' },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Ish haqi bo'yicha hisobot"
          subtitle="Xodimlar kesimida oylik, KPI, jarima va to'lov holati"
          actions={<ReportExportActions type="payroll" params={applied} />}
        />
        <ReportToolbar
          search={filters.search}
          onSearch={(v) => set('search', v)}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((o) => !o)}
          onClear={clear}
          hasFilters={hasFilters}
          onGenerate={generate}
          generating={isFetching}
        />

        {filtersOpen && (
          <Card className="mt-3 p-4">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField label="Hisoblangan vaqti">
                <DateRange from={filters.createdFrom} to={filters.createdTo} onFrom={(v) => set('createdFrom', v)} onTo={(v) => set('createdTo', v)} />
              </FilterField>
              <FilterField label="Tasdiqlangan vaqti">
                <DateRange from={filters.confirmedFrom} to={filters.confirmedTo} onFrom={(v) => set('confirmedFrom', v)} onTo={(v) => set('confirmedTo', v)} />
              </FilterField>
              <FilterField label="Xodimlar">
                <UserPickerField value={filters.userIds} onChange={(v) => set('userIds', v)} users={users} placeholder="Xodimlar tanlang" title="Xodim tanlang" />
              </FilterField>
              <FilterField label="Hisobchi">
                <UserPickerField value={filters.accountantIds} onChange={(v) => set('accountantIds', v)} users={accountants} placeholder="Hisobchi tanlang" title="Hisobchi tanlang" />
              </FilterField>

              <FilterField label="Oy uchun">
                <FilterSelect value={filters.month} onChange={(v) => set('month', v)} options={MONTH_OPTS} placeholder="Oy tanlang" />
              </FilterField>
              <FilterField label="Holati">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS} placeholder="Holatini tanlang" />
              </FilterField>
              <FilterField label="Jami miqdori (UZS)">
                <MoneyRange from={filters.totalFrom} to={filters.totalTo} onFrom={(v) => set('totalFrom', v)} onTo={(v) => set('totalTo', v)} />
              </FilterField>
              <FilterField label="Oylik maoshi (UZS)">
                <MoneyRange from={filters.fixedFrom} to={filters.fixedTo} onFrom={(v) => set('fixedFrom', v)} onTo={(v) => set('fixedTo', v)} />
              </FilterField>

              <FilterField label="KPI bonus (UZS)">
                <MoneyRange from={filters.kpiFrom} to={filters.kpiTo} onFrom={(v) => set('kpiFrom', v)} onTo={(v) => set('kpiTo', v)} />
              </FilterField>
              <FilterField label="Jarima miqdori (UZS)">
                <MoneyRange from={filters.penaltyFrom} to={filters.penaltyTo} onFrom={(v) => set('penaltyFrom', v)} onTo={(v) => set('penaltyTo', v)} />
              </FilterField>
            </div>
          </Card>
        )}

        {totals && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-sm text-text-sub">Yozuvlar</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{totals.count}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami oylik</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.fixedAmount)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">Jami (oylik+ulush)</p><p className="mt-1 text-lg font-semibold text-text-strong tabular-nums">{money(totals.total)}</p></Card>
            <Card className="p-4"><p className="text-sm text-text-sub">To'langan oylik</p><p className="mt-1 text-lg font-semibold text-success-strong tabular-nums">{money(totals.paid)}</p></Card>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable columns={columns} rows={rows} loading={isFetching} emptyTitle={generated ? 'Oyliklar topilmadi' : 'Hisobot shakllantirilmagan'} emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."} />
      </div>
    </div>
  );
}
