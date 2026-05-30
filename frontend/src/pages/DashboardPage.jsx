import { motion } from 'framer-motion';
import {
  Briefcase, Users, AlertTriangle, CheckCircle2, Wallet, Clock,
  TrendingUp, TrendingDown, Banknote, ListChecks,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS, PROJECT_STATUS } from '@/lib/constants';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useProjects } from '@/features/projects/projectsApi';
import { useBalance, useRequests } from '@/features/finance/financeApi';
import { useFinanceReport } from '@/features/reports/reportsApi';

const stagger = {
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function MotionGrid({ children, className }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}
function MItem({ children }) {
  return <motion.div variants={item}>{children}</motion.div>;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  return (
    <div>
      <PageHeader title={`Salom, ${user?.fullName?.split(' ')[0] || ''}! 👋`} subtitle={`${ROLE_LABELS[role]} · Boshqaruv paneli`} />
      {role === 'accountant' ? <AccountantDashboard /> : role === 'employee' ? <EmployeeDashboard /> : <AdminDashboard />}
    </div>
  );
}

// ── ADMIN / MANAGER / SUPERADMIN ──
function AdminDashboard() {
  const { data, isLoading } = useProjects({ limit: 100 });
  const { data: finance } = useFinanceReport();
  const projects = data?.items || [];
  const active = projects.filter((p) => p.status === 'active').length;
  const overdue = projects.filter((p) => p.status === 'overdue').length;
  const completed = projects.filter((p) => p.status === 'completed').length;

  const statusData = Object.entries(PROJECT_STATUS).map(([k, v]) => ({
    name: v.label,
    value: projects.filter((p) => p.status === k).length,
  }));
  const m = (v) => formatMoney(Math.round((v || 0) * 100));

  if (isLoading) return <DashSkeleton />;

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(finance?.income)} tone="success" /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(finance?.expenses)} tone="error" /></MItem>
        <MItem><StatCard icon={Banknote} label="Oyliklar" value={m(finance?.payroll)} tone="neutral" /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(finance?.net)} tone="accent" /></MItem>
      </MotionGrid>

      <MotionGrid className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MItem><StatCard icon={Briefcase} label="Faol loyihalar" value={active} tone="accent" /></MItem>
        <MItem><StatCard icon={AlertTriangle} label="Kechikkan" value={overdue} tone="error" /></MItem>
        <MItem><StatCard icon={CheckCircle2} label="Yakunlangan" value={completed} tone="success" /></MItem>
      </MotionGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Loyiha bosqichlari taqsimoti</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                <Tooltip cursor={{ fill: 'var(--bg-elevation-2)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, i) => <Cell key={i} fill="var(--accent-strong)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>So'nggi loyihalar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                  <p className="text-xs text-text-soft">{formatDate(p.deadline)}</p>
                </div>
                <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
              </div>
            ))}
            {!projects.length && <p className="text-sm text-text-soft">Loyihalar yo'q.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── ACCOUNTANT ──
function AccountantDashboard() {
  const { data: requests, isLoading: rl } = useRequests();
  const { data: finance, isLoading: fl } = useFinanceReport();
  const pending = (requests || []).filter((r) => r.status === 'pending');
  const m = (v) => formatMoney(Math.round((v || 0) * 100));

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={Clock} label="To'lovga so'rovlar" value={pending.length} tone="error" loading={rl} /></MItem>
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(finance?.income)} tone="success" loading={fl} /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(finance?.expenses)} tone="neutral" loading={fl} /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(finance?.net)} tone="accent" loading={fl} /></MItem>
      </MotionGrid>

      <Card className="mt-6">
        <CardHeader><CardTitle>To'lov kutayotgan so'rovlar</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-stroke-soft p-3">
              <div>
                <p className="text-sm font-medium text-text-strong">{r.user?.fullName}</p>
                <p className="text-xs text-text-soft">{r.reason}</p>
              </div>
              <span className="font-semibold text-text-strong">{formatMoney(r.amount, r.currency)}</span>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-text-soft">Kutilayotgan so'rovlar yo'q.</p>}
        </CardContent>
      </Card>
    </>
  );
}

// ── EMPLOYEE ──
function EmployeeDashboard() {
  const { data: balance, isLoading: bl } = useBalance();
  const { data: projectData, isLoading: pl } = useProjects({ limit: 100 });
  const projects = projectData?.items || [];

  // Simple synthetic income trend from completed projects (visual)
  const incomeData = projects
    .filter((p) => p.status === 'completed')
    .slice(0, 8)
    .map((p, i) => ({ name: `#${i + 1}`, value: Number(p.price) / 100 / 1000 }));

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MItem><StatCard icon={Wallet} label="Mavjud balans" value={formatMoney(balance?.balance)} tone="accent" loading={bl} /></MItem>
        <MItem><StatCard icon={Clock} label="Pending" value={formatMoney(balance?.pending)} tone="neutral" loading={bl} /></MItem>
        <MItem><StatCard icon={Briefcase} label="Loyihalarim" value={projects.length} tone="success" loading={pl} /></MItem>
      </MotionGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Daromad dinamikasi (ming so'm)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={incomeData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-sub)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-sub)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="var(--accent-strong)" strokeWidth={2} fill="url(#incomeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Loyihalarim</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5">
                <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
              </div>
            ))}
            {!projects.length && <p className="text-sm text-text-soft">Loyihalar yo'q.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const tooltipStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--stroke-sub)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--text-strong)',
};

function DashSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  );
}
