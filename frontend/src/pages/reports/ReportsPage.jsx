import { useState } from 'react';
import { FileSpreadsheet, FileText, TrendingUp, TrendingDown, Wallet, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatMoney } from '@/lib/utils/format';
import { PROJECT_STATUS } from '@/lib/constants';
import { apiError } from '@/lib/api/axios';
import { useProjectsReport, useFinanceReport, useEmployeesReport, downloadReport } from '@/features/reports/reportsApi';

const money = (v) => formatMoney(Math.round((v || 0) * 100)); // unit -> tiyin for formatMoney

export function ReportsPage() {
  const [tab, setTab] = useState('finance');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const exportFile = async (type, format) => {
    setDownloading(true);
    try {
      await downloadReport({ type, format, from, to });
      toast.success('Yuklab olindi');
    } catch (e) {
      toast.error(apiError(e, 'Eksport xatosi'));
    } finally {
      setDownloading(false);
    }
  };

  const tabs = [
    { value: 'finance', label: 'Moliya' },
    { value: 'projects', label: 'Loyihalar' },
    { value: 'employees', label: 'Xodimlar' },
  ];

  return (
    <div>
      <PageHeader title="Hisobotlar" subtitle="Moliyaviy va loyiha hisobotlari" />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-text-soft">Dan</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-soft">Gacha</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        {tab !== 'finance' && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => exportFile(tab, 'xlsx')} loading={downloading}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => exportFile(tab, 'pdf')} loading={downloading}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        )}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'finance' && <FinanceReport from={from} to={to} />}
      {tab === 'projects' && <ProjectsReport from={from} to={to} />}
      {tab === 'employees' && <EmployeesReport />}
    </div>
  );
}

function FinanceReport({ from, to }) {
  const { data, isLoading } = useFinanceReport({ from: from || undefined, to: to || undefined });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={TrendingUp} label="Tushum" value={money(data?.income)} tone="success" loading={isLoading} />
      <StatCard icon={TrendingDown} label="Xarajatlar" value={money(data?.expenses)} tone="error" loading={isLoading} />
      <StatCard icon={Wallet} label="Oyliklar" value={money(data?.payroll)} tone="neutral" loading={isLoading} />
      <StatCard icon={TrendingUp} label="Sof foyda" value={money(data?.net)} tone={data?.net >= 0 ? 'accent' : 'error'} loading={isLoading} />
    </div>
  );
}

function ProjectsReport({ from, to }) {
  const { data, isLoading } = useProjectsReport({ from: from || undefined, to: to || undefined });
  const columns = [
    { key: 'name', header: 'Loyiha' },
    { key: 'client', header: 'Mijoz' },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={PROJECT_STATUS[r.status]?.tone}>{PROJECT_STATUS[r.status]?.label}</Badge> },
    { key: 'price', header: 'Summa', render: (r) => money(r.price) },
    { key: 'shares', header: 'Ulushlar', render: (r) => money(r.shares) },
    { key: 'profit', header: 'Foyda', render: (r) => <span className={r.profit >= 0 ? 'text-text-accent' : 'text-error-strong'}>{money(r.profit)}</span> },
  ];
  return (
    <div>
      {data?.totals && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap gap-6 py-4">
            <Total label="Jami summa" value={money(data.totals.price)} />
            <Total label="Jami ulushlar" value={money(data.totals.shares)} />
            <Total label="Jami foyda" value={money(data.totals.profit)} accent />
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} data={data?.rows} loading={isLoading} emptyTitle="Loyihalar yo'q" />
    </div>
  );
}

function EmployeesReport() {
  const { data, isLoading } = useEmployeesReport();
  const columns = [
    { key: 'fullName', header: 'F.I.O' },
    { key: 'role', header: 'Rol' },
    { key: 'tasks', header: 'Vazifalar' },
    { key: 'balance', header: 'Balans', render: (r) => money(r.balance) },
    { key: 'earned', header: 'Jami daromad', render: (r) => money(r.earned) },
  ];
  return <DataTable columns={columns} data={data} loading={isLoading} emptyTitle="Xodimlar yo'q" />;
}

function Total({ label, value, accent }) {
  return (
    <div>
      <p className="text-xs text-text-soft">{label}</p>
      <p className={`text-lg font-semibold ${accent ? 'text-text-accent' : 'text-text-strong'}`}>{value}</p>
    </div>
  );
}
