import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/lib/utils/format';
import { UZ_REGIONS } from '@/lib/uzRegions';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useEmployeeReport } from '@/features/reports/reportsApi';
import { ReportExportActions, ReportToolbar } from '@/features/reports/ReportShell';
import { FilterField, FilterSelect, MoneyRange, StatusRange, UserPickerField, DateRange } from '@/features/reports/ReportFilters';
import { ReportTable } from '@/features/reports/ReportTable';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin

// Status variantlari (rangli nuqta bilan)
const PROJECT_OPTS = [
  { value: 'completed', label: 'Tugatilgan', dot: '#22C55E' },
  { value: 'active', label: 'Jarayonda', dot: '#14B8A6' },
  { value: 'cancelled', label: 'Bekor qilingan', dot: '#111827' },
  { value: 'overdue', label: "Muddati o'tgan", dot: '#EF4444' },
  { value: 'planning', label: 'Rejalashtirilgan', dot: '#9CA3AF' },
];
const TASK_OPTS = [
  { value: 'todo', label: 'Qilish kerak', dot: '#F59E0B' },
  { value: 'in_progress', label: 'Jarayonda', dot: '#3B82F6' },
  { value: 'done', label: 'Bajarilgan', dot: '#8B5CF6' },
  { value: 'production', label: 'Ishga tushirilgan', dot: '#22C55E' },
  { value: 'checked', label: 'Tekshirilgan', dot: '#06B6D4' },
  { value: 'rejected', label: 'Rad etilgan', dot: '#EF4444' },
  { value: 'overdue', label: "Muddati o'tgan", dot: '#6B7280' },
];
const MEETING_OPTS = [
  { value: 'attended', label: 'Qatnashgan', dot: '#22C55E' },
  { value: 'excused', label: 'Qatnashmagan "sababli"', dot: '#F59E0B' },
  { value: 'unexcused', label: 'Qatnashmagan "sababsiz"', dot: '#EF4444' },
];
const REQUEST_OPTS = [
  { value: 'pending', label: "To'lanmagan", dot: '#F59E0B' },
  { value: 'paid', label: "To'langan", dot: '#22C55E' },
  { value: 'closed', label: 'Tasdiqlangan', dot: '#3B82F6' },
  { value: 'rejected', label: 'Bekor qilingan', dot: '#EF4444' },
];

const EMPTY = {
  search: '', joinedFrom: '', joinedTo: '', positionId: '', region: '',
  salaryFrom: '', salaryTo: '', balanceFrom: '', balanceTo: '',
  projectStatus: '', projectsFrom: '', projectsTo: '',
  taskStatus: '', tasksFrom: '', tasksTo: '',
  meetingStatus: '', meetingsFrom: '', meetingsTo: '',
  requestStatus: '', requestAmountFrom: '', requestAmountTo: '',
  payrollFrom: '', payrollTo: '',
  userIds: [],
};

function buildParams(f) {
  const p = {};
  const add = (k) => { if (f[k] !== '' && f[k] != null) p[k] = f[k]; };
  ['search', 'joinedFrom', 'joinedTo', 'positionId', 'region',
    'salaryFrom', 'salaryTo', 'balanceFrom', 'balanceTo',
    'projectStatus', 'projectsFrom', 'projectsTo',
    'taskStatus', 'tasksFrom', 'tasksTo',
    'meetingStatus', 'meetingsFrom', 'meetingsTo',
    'requestStatus', 'requestAmountFrom', 'requestAmountTo',
    'payrollFrom', 'payrollTo'].forEach(add);
  if (f.userIds?.length) p.userIds = f.userIds.join(',');
  return p;
}

export function EmployeeReportPage() {
  const [filters, setFilters] = useState(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [applied, setApplied] = useState({});
  const [generated, setGenerated] = useState(false);

  const { data: positions } = useReference('position');
  const { data: usersData } = useUsersList({ limit: 500 });
  const users = usersData?.items || [];

  const { data, isFetching } = useEmployeeReport(applied, generated);

  const set = (k, v) => setFilters((s) => ({ ...s, [k]: v }));
  const hasFilters = useMemo(() => JSON.stringify(buildParams(filters)) !== '{}', [filters]);

  const generate = () => { setApplied(buildParams(filters)); setGenerated(true); setFiltersOpen(false); toast.success("Ma'lumotlar shakllantirildi"); };
  const clear = () => { setFilters(EMPTY); setApplied({}); setGenerated(false); setFiltersOpen(true); };

  const positionOpts = (positions || []).map((p) => ({ value: p.id, label: p.name }));
  const regionOpts = UZ_REGIONS.map((r) => ({ value: r.name, label: r.name }));

  const columns = [
    { key: 'fullName', header: 'Ism Sharifi' },
    { key: 'position', header: 'Lavozim' },
    { key: 'region', header: 'Viloyat' },
    { key: 'district', header: 'Tuman' },
    { key: 'phone', header: 'Telefon' },
    { key: 'fixedSalary', header: 'Oylik maoshi (UZS)', align: 'right', mono: true, render: (r) => money(r.fixedSalary) },
    { key: 'balance', header: 'Balans (UZS)', align: 'right', mono: true, render: (r) => money(r.balance) },
    { key: 'projectsCount', header: 'Loyihalar', align: 'center' },
    {
      group: 'Vazifalar',
      children: [
        { key: 'tasksTotal', header: 'Jami', align: 'center' },
        { key: 't_todo', header: 'Qilish kerak', align: 'center', render: (r) => r.tasks.todo },
        { key: 't_in_progress', header: 'Jarayonda', align: 'center', render: (r) => r.tasks.in_progress },
        { key: 't_overdue', header: "Muddati o'tgan", align: 'center', render: (r) => r.tasks.overdue },
        { key: 't_done', header: 'Bajarilgan', align: 'center', render: (r) => r.tasks.done },
        { key: 't_production', header: 'Ishga tushirilgan', align: 'center', render: (r) => r.tasks.production },
        { key: 't_checked', header: 'Tekshirilgan', align: 'center', render: (r) => r.tasks.checked },
        { key: 't_rejected', header: 'Rad etilgan', align: 'center', render: (r) => r.tasks.rejected },
      ],
    },
    {
      group: "Yig'ilishlar",
      children: [
        { key: 'meetingsTotal', header: 'Jami', align: 'center' },
        { key: 'meetingsAttended', header: 'Qatnashgan', align: 'center' },
        { key: 'meetingsExcused', header: 'Qatnashmagan (sababli)', align: 'center' },
        { key: 'meetingsUnexcused', header: 'Qatnashmagan (sababsiz)', align: 'center' },
      ],
    },
    {
      group: "Xarajat so'rovi",
      children: [
        { key: 'requestsCount', header: 'Soni', align: 'center' },
        { key: 'requestsTotal', header: 'Summasi (UZS)', align: 'right', mono: true, render: (r) => money(r.requestsTotal) },
      ],
    },
    { key: 'payrollTotal', header: 'Ish haqi (UZS)', align: 'right', mono: true, render: (r) => money(r.payrollTotal) },
  ];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Xodim bo'yicha hisobot"
          subtitle="Xodimlar kesimida vazifa, yig'ilish, moliya ko'rsatkichlari"
          actions={<ReportExportActions type="employee-report" params={applied} />}
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
              <FilterField label="Ishga kirgan vaqti">
                <DateRange from={filters.joinedFrom} to={filters.joinedTo} onFrom={(v) => set('joinedFrom', v)} onTo={(v) => set('joinedTo', v)} />
              </FilterField>
              <FilterField label="Lavozimi">
                <FilterSelect value={filters.positionId} onChange={(v) => set('positionId', v)} options={positionOpts} placeholder="Lavozim tanlang" />
              </FilterField>
              <FilterField label="Viloyat">
                <FilterSelect value={filters.region} onChange={(v) => set('region', v)} options={regionOpts} placeholder="Viloyat tanlang" />
              </FilterField>

              <FilterField label="Oylik maoshi (UZS)">
                <MoneyRange from={filters.salaryFrom} to={filters.salaryTo} onFrom={(v) => set('salaryFrom', v)} onTo={(v) => set('salaryTo', v)} />
              </FilterField>
              <FilterField label="Balansi (UZS)">
                <MoneyRange from={filters.balanceFrom} to={filters.balanceTo} onFrom={(v) => set('balanceFrom', v)} onTo={(v) => set('balanceTo', v)} />
              </FilterField>
              <FilterField label="Ish haqi (UZS)">
                <MoneyRange from={filters.payrollFrom} to={filters.payrollTo} onFrom={(v) => set('payrollFrom', v)} onTo={(v) => set('payrollTo', v)} />
              </FilterField>
              <FilterField label="Xodimlar">
                <UserPickerField value={filters.userIds} onChange={(v) => set('userIds', v)} users={users} placeholder="Xodim tanlang" title="Xodim tanlang" />
              </FilterField>

              <FilterField label="Vazifalar" className="sm:col-span-2">
                <StatusRange
                  statusValue={filters.taskStatus} onStatus={(v) => set('taskStatus', v)} statusOptions={TASK_OPTS}
                  from={filters.tasksFrom} to={filters.tasksTo} onFrom={(v) => set('tasksFrom', v)} onTo={(v) => set('tasksTo', v)}
                />
              </FilterField>
              <FilterField label="Loyihalar" className="sm:col-span-2">
                <StatusRange
                  statusValue={filters.projectStatus} onStatus={(v) => set('projectStatus', v)} statusOptions={PROJECT_OPTS}
                  from={filters.projectsFrom} to={filters.projectsTo} onFrom={(v) => set('projectsFrom', v)} onTo={(v) => set('projectsTo', v)}
                />
              </FilterField>

              <FilterField label="Yig'ilishlar" className="sm:col-span-2">
                <StatusRange
                  statusValue={filters.meetingStatus} onStatus={(v) => set('meetingStatus', v)} statusOptions={MEETING_OPTS}
                  from={filters.meetingsFrom} to={filters.meetingsTo} onFrom={(v) => set('meetingsFrom', v)} onTo={(v) => set('meetingsTo', v)}
                />
              </FilterField>
              <FilterField label="Xarajat so'rovi (UZS)" className="sm:col-span-2">
                <StatusRange
                  statusValue={filters.requestStatus} onStatus={(v) => set('requestStatus', v)} statusOptions={REQUEST_OPTS} statusPlaceholder="Holat"
                  from={filters.requestAmountFrom} to={filters.requestAmountTo} onFrom={(v) => set('requestAmountFrom', v)} onTo={(v) => set('requestAmountTo', v)} money
                />
              </FilterField>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <ReportTable
          columns={columns}
          rows={generated ? data?.rows : []}
          loading={isFetching}
          emptyTitle={generated ? 'Xodimlar topilmadi' : 'Hisobot shakllantirilmagan'}
          emptyDescription={generated ? "Filtrlarni o'zgartiring yoki tozalang." : "Filtrlarni tanlab \"Shakllantirish\" tugmasini bosing."}
        />
      </div>
    </div>
  );
}
