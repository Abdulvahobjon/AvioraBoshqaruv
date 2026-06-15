import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useUsersList } from '@/features/users/usersApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useReference } from '@/features/settings/settingsApi';
import { useExpenseRequestsReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect, MoneyRange, UserPickerField, DateRange } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100));

const TYPE_OPTS = [
  { value: 'company', label: 'Kompaniya xarajatlari' },
  { value: 'salary', label: "Mablag' chiqarish" },
  { value: 'other', label: 'Boshqa xarajatlar' },
];
const PAY_OPTS = [
  { value: 'card', label: 'Karta orqali' },
  { value: 'cash', label: 'Naqd pul' },
];
const STATUS_OPTS = [
  { value: 'pending', label: "To'lanmagan", dot: '#F59E0B' },
  { value: 'paid', label: "To'langan", dot: '#22C55E' },
  { value: 'closed', label: 'Tasdiqlangan', dot: '#3B82F6' },
  { value: 'rejected', label: 'Bekor qilingan', dot: '#EF4444' },
];
const TYPE_LABEL = Object.fromEntries(TYPE_OPTS.map((o) => [o.value, o.label]));
const PAY_LABEL = Object.fromEntries(PAY_OPTS.map((o) => [o.value, o.label]));
const STATUS_LABEL = Object.fromEntries(STATUS_OPTS.map((o) => [o.value, o.label]));

const DATE_FIELDS = [
  { label: "So'ralgan vaqt", from: 'reqFrom', to: 'reqTo' },
  { label: 'Tasdiqlangan vaqt', from: 'confFrom', to: 'confTo' },
  { label: "To'langan vaqt", from: 'paidFrom', to: 'paidTo' },
  { label: 'Bekor qilingan vaqt', from: 'cancelFrom', to: 'cancelTo' },
];

const EMPTY = {
  search: '',
  reqFrom: '', reqTo: '', confFrom: '', confTo: '', paidFrom: '', paidTo: '', cancelFrom: '', cancelTo: '',
  amountFrom: '', amountTo: '', paymentMethod: '', status: '',
  userIds: [], accountantIds: [], projectIds: [], type: '', categoryId: '',
};

function buildParams(f) {
  const p = {};
  const add = (k) => { if (f[k] !== '' && f[k] != null) p[k] = f[k]; };
  ['reqFrom', 'reqTo', 'confFrom', 'confTo', 'paidFrom', 'paidTo', 'cancelFrom', 'cancelTo',
    'amountFrom', 'amountTo', 'paymentMethod', 'status', 'categoryId'].forEach(add);
  if (f.type) p.expenseType = f.type; // backend 'expenseType' deb kutadi (export 'type' bilan to'qnashmaslik uchun)
  if (f.userIds?.length) p.userIds = f.userIds.join(',');
  if (f.accountantIds?.length) p.accountantIds = f.accountantIds.join(',');
  if (f.projectIds?.length) p.projectIds = f.projectIds.join(',');
  return p;
}

export function ExpensesReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data: usersData } = useUsersList({ limit: 500 });
  const users = usersData?.items || [];
  const { data: projects } = useProjects({ limit: 500 });
  const { data: categories } = useReference('expenseCategory');
  const { data, isFetching } = useExpenseRequestsReport(applied, generated);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}', [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const projectUsers = (projects?.items || []).map((p) => ({ id: p.id, fullName: p.name }));
  const categoryOpts = (categories || []).map((c) => ({ value: c.id, label: c.name }));

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.fullName?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const dt = (d) => (d ? formatDate(d, true) : '—');

  const columns = [
    { key: 'fullName', header: 'Ism Sharifi' },
    { key: 'project', header: 'Loyiha nomi' },
    { key: 'type', header: 'Xarajat turi', render: (r) => TYPE_LABEL[r.type] || r.type },
    { key: 'category', header: 'Toifa' },
    { key: 'amount', header: 'Miqdori (UZS)', align: 'right', mono: true, render: (r) => money(r.amount) },
    { key: 'paymentMethod', header: "To'lov turi", render: (r) => (r.paymentMethod ? PAY_LABEL[r.paymentMethod] : '—') },
    { key: 'status', header: 'Holati', render: (r) => STATUS_LABEL[r.status] || r.status },
    { key: 'reason', header: "So'rov sababi" },
    { key: 'createdAt', header: "So'ralgan vaqti", render: (r) => dt(r.createdAt) },
    { key: 'paidAt', header: "To'langan vaqti", render: (r) => dt(r.paidAt) },
    { key: 'confirmedAt', header: 'Tasdiqlangan vaqti', render: (r) => dt(r.confirmedAt) },
    { key: 'accountant', header: 'Hisobchi' },
    { key: 'canceledAt', header: 'Bekor qilingan vaqt', render: (r) => dt(r.canceledAt) },
    { key: 'cancelReason', header: 'Bekor qilish sababi' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Xarajat so'rovlari bo'yicha hisobot"
          subtitle="Moliyaviy so'rovlar to'liq kesimi"
          actions={<ReportExportActions type="expense-requests" params={applied} />}
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
              {DATE_FIELDS.map((d) => (
                <FilterField key={d.from} label={d.label}>
                  <DateRange from={filters[d.from]} to={filters[d.to]} onFrom={(v) => set(d.from, v)} onTo={(v) => set(d.to, v)} />
                </FilterField>
              ))}
              <FilterField label="Miqdor (UZS)">
                <MoneyRange from={filters.amountFrom} to={filters.amountTo} onFrom={(v) => set('amountFrom', v)} onTo={(v) => set('amountTo', v)} />
              </FilterField>
              <FilterField label="To'lov turi">
                <FilterSelect value={filters.paymentMethod} onChange={(v) => set('paymentMethod', v)} options={PAY_OPTS} placeholder="To'lov turi tanlang" />
              </FilterField>
              <FilterField label="Holati">
                <FilterSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS_OPTS} placeholder="Holatini tanlang" />
              </FilterField>
              <FilterField label="Xodimlar">
                <UserPickerField value={filters.userIds} onChange={(v) => set('userIds', v)} users={users} placeholder="Xodim tanlang" title="Xodimlar tanlang" />
              </FilterField>
              <FilterField label="Hisobchi">
                <UserPickerField value={filters.accountantIds} onChange={(v) => set('accountantIds', v)} users={users} placeholder="Hisobchi tanlang" title="Hisobchi tanlang" />
              </FilterField>
              <FilterField label="Loyihalar">
                <UserPickerField value={filters.projectIds} onChange={(v) => set('projectIds', v)} users={projectUsers} placeholder="Loyiha tanlang" title="Loyiha tanlang" />
              </FilterField>
              <FilterField label="Xarajat turi">
                <FilterSelect value={filters.type} onChange={(v) => set('type', v)} options={TYPE_OPTS} placeholder="Xarajat turi tanlang" />
              </FilterField>
              <FilterField label="Toifa">
                <FilterSelect value={filters.categoryId} onChange={(v) => set('categoryId', v)} options={categoryOpts} placeholder="Toifa tanlang" />
              </FilterField>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable
          columns={columns}
          rows={rows}
          loading={isFetching}
          emptyTitle={generated ? "So'rovlar topilmadi" : 'Hisobot shakllantirilmagan'}
          emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."}
        />
      </div>
    </div>
  );
}
