import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useUsersList } from '@/features/users/usersApi';
import { useProjectsReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, MoneyRange, UserPickerField, DateRange } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';
import { PROJECT_STATUS } from '@/lib/constants';

const money = (v) => formatMoney(Math.round((v || 0) * 100));
const statusLabel = (s) => PROJECT_STATUS[s]?.label || s;

const EMPTY = {
  search: '', from: '', to: '', bonusFrom: '', bonusTo: '',
  authorIds: [], managerIds: [], employeeIds: [], testerIds: [],
};

function buildParams(f) {
  const p = {};
  if (f.from) p.from = f.from;
  if (f.to) p.to = f.to;
  if (f.bonusFrom !== '' && f.bonusFrom != null) p.bonusFrom = f.bonusFrom;
  if (f.bonusTo !== '' && f.bonusTo != null) p.bonusTo = f.bonusTo;
  if (f.authorIds?.length) p.authorIds = f.authorIds.join(',');
  if (f.managerIds?.length) p.managerIds = f.managerIds.join(',');
  if (f.employeeIds?.length) p.employeeIds = f.employeeIds.join(',');
  if (f.testerIds?.length) p.testerIds = f.testerIds.join(',');
  return p;
}

export function ProjectsReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data: usersData } = useUsersList({ limit: 500 });
  const users = usersData?.items || [];
  const { data, isFetching } = useProjectsReport(applied, generated);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}' || !!filters.search, [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const rows = useMemo(() => {
    if (!generated) return [];
    const all = data?.rows || [];
    if (!filters.search) return all;
    const q = filters.search.toLowerCase();
    return all.filter((r) => r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q));
  }, [generated, data, filters.search]);

  const columns = [
    { key: 'code', header: 'Titul' },
    { key: 'name', header: 'Nomi' },
    { key: 'description', header: 'Tavsifi' },
    { key: 'deadline', header: 'Muddati', render: (r) => (r.deadline ? formatDate(r.deadline, true) : '—') },
    { key: 'status', header: 'Holati', render: (r) => statusLabel(r.status) },
    { key: 'managerBonus', header: 'Boshqaruvchi bonusi', align: 'right', mono: true, render: (r) => money(r.managerBonus) },
    { key: 'author', header: 'Muallif' },
    { key: 'managers', header: 'Boshqaruvchi' },
    { key: 'employees', header: 'Xodimlar' },
    { key: 'testers', header: 'Sinovchilar' },
    {
      group: 'Vazifalar',
      children: [
        { key: 'v_total', header: 'Jami', align: 'center', render: (r) => r.tasksTotal },
        { key: 'v_todo', header: 'Qilish kerak', align: 'center', render: (r) => r.tasks.todo },
        { key: 'v_in_progress', header: 'Jarayonda', align: 'center', render: (r) => r.tasks.in_progress },
        { key: 'v_overdue', header: "Muddati o'tgan", align: 'center', render: (r) => r.tasks.overdue },
        { key: 'v_done', header: 'Bajarilgan', align: 'center', render: (r) => r.tasks.done },
        { key: 'v_production', header: 'Ishga tushirilgan', align: 'center', render: (r) => r.tasks.production },
        { key: 'v_checked', header: 'Tekshirilgan', align: 'center', render: (r) => r.tasks.checked },
        { key: 'v_rejected', header: 'Rad etilgan', align: 'center', render: (r) => r.tasks.rejected },
      ],
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Loyiha bo'yicha hisobot"
          subtitle="Loyihalar, jamoa va vazifa statuslari kesimi"
          actions={<ReportExportActions type="projects" params={applied} />}
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
              <FilterField label="Muddati">
                <DateRange from={filters.from} to={filters.to} onFrom={(v) => set('from', v)} onTo={(v) => set('to', v)} />
              </FilterField>
              <FilterField label="Boshqaruvchi bonusi">
                <MoneyRange from={filters.bonusFrom} to={filters.bonusTo} onFrom={(v) => set('bonusFrom', v)} onTo={(v) => set('bonusTo', v)} />
              </FilterField>
              <FilterField label="Muallifi">
                <UserPickerField value={filters.authorIds} onChange={(v) => set('authorIds', v)} users={users} placeholder="Muallifi tanlang" title="Muallif tanlang" />
              </FilterField>
              <FilterField label="Boshqaruvchi">
                <UserPickerField value={filters.managerIds} onChange={(v) => set('managerIds', v)} users={users} placeholder="Boshqaruvchi tanlang" title="Boshqaruvchi tanlang" />
              </FilterField>
              <FilterField label="Xodimlar">
                <UserPickerField value={filters.employeeIds} onChange={(v) => set('employeeIds', v)} users={users} placeholder="Xodimlar tanlang" title="Xodimlar tanlang" />
              </FilterField>
              <FilterField label="Sinovchilar">
                <UserPickerField value={filters.testerIds} onChange={(v) => set('testerIds', v)} users={users} placeholder="Sinovchilar tanlang" title="Sinovchilar tanlang" />
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
          emptyTitle={generated ? 'Loyihalar topilmadi' : 'Hisobot shakllantirilmagan'}
          emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."}
        />
      </div>
    </div>
  );
}
