import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, Wallet, Clock,
  TrendingUp, TrendingDown, Banknote, ListChecks, Coins,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Legend,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS, PROJECT_STATUS } from '@/lib/constants';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { useDashboard, useAnalytics } from '@/features/reports/reportsApi';
import { useRequests } from '@/features/finance/financeApi';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function MotionGrid({ children, className }) {
  return <motion.div variants={stagger} initial="hidden" animate="show" className={className}>{children}</motion.div>;
}
function MItem({ children }) {
  return <motion.div variants={item} className="h-full">{children}</motion.div>;
}

// money: backend returns whole-unit so'm; formatMoney expects tiyin → ×100.
const m = (v) => formatMoney(Math.round((v || 0) * 100));
const compact = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' mln' : v >= 1e3 ? Math.round(v / 1e3) + ' ming' : String(v || 0));

const PERIODS = [
  { key: '1m', label: '1 oy' },
  { key: '3m', label: '3 oy' },
  { key: '6m', label: '6 oy' },
  { key: '1y', label: '1 yil' },
];
const PROJECT_COLORS = {
  completed: 'var(--success-strong)',
  active: 'var(--accent-strong)',
  cancelled: 'var(--text-soft)',
  overdue: 'var(--error-strong)',
  planning: 'var(--warning-strong)',
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  // Davr holati sahifa darajasida — tablar eng yuqorida (sarlavhada), analitika shunga bog'lanadi.
  const [period, setPeriod] = useState('1m');
  const { data: analytics, isLoading: aLoading } = useAnalytics(period);
  const shared = { analytics, aLoading };

  return (
    <div>
      <PageHeader
        title={`Salom, ${user?.fullName?.split(' ')[0] || ''}! 👋`}
        subtitle={`${ROLE_LABELS[role]} · Boshqaruv paneli`}
        actions={<PeriodTabs value={period} onChange={setPeriod} />}
      />
      {role === 'accountant' ? <AccountantDashboard {...shared} />
        : role === 'employee' ? <EmployeeDashboard {...shared} />
          : <AdminDashboard {...shared} />}
    </div>
  );
}

function PeriodTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-stroke-sub bg-bg-1 p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === p.key ? 'bg-accent-strong text-text-white' : 'text-text-sub hover:text-text-strong',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Umumiy grafik kartalari (hamma rol uchun) ──

/** Vazifalar — joriy davr vs o'tgan davr (chiziqli grafik). */
function TasksChart({ data, loading }) {
  return (
    <Card>
      <CardHeader><CardTitle>Vazifalar</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data || []} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="previous" name="O'tgan davr" stroke="var(--accent-sub)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="current" name="Vazifalar" stroke="var(--accent-strong)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-base)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Loyihalar — status bo'yicha ustunli grafik. */
function ProjectsChart({ data, loading }) {
  return (
    <Card>
      <CardHeader><CardTitle>Loyihalar</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data || []} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
              <Tooltip cursor={{ fill: 'var(--bg-elevation-2)' }} contentStyle={tooltipStyle} formatter={(v) => [v, 'Loyihalar']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {(data || []).map((p) => <Cell key={p.status} fill={PROJECT_COLORS[p.status] || 'var(--accent-strong)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Yig'ilishlar dinamikasi — donut + ko'rsatkichlar. */
function MeetingsCard({ data, loading }) {
  return (
    <Card>
      <CardHeader><CardTitle>Yig'ilishlar dinamikasi</CardTitle></CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-[260px] w-full" /> : <MeetingDynamics m={data} />}
      </CardContent>
    </Card>
  );
}

function MeetingDynamics({ m }) {
  const slices = [
    { name: 'Qatnashdi', value: m?.attended || 0, color: 'var(--success-strong)', tone: 'success' },
    { name: 'Sababli', value: m?.excused || 0, color: 'var(--accent-sub)', tone: 'info' },
    { name: 'Sababsiz', value: m?.unexcused || 0, color: 'var(--error-strong)', tone: 'error' },
  ];
  const totalAtt = slices.reduce((s, d) => s + d.value, 0);
  const pct = (v) => (totalAtt ? Math.round((v / totalAtt) * 100) : 0);
  const mins = m?.timeSpentMinutes || 0;
  const hours = Math.floor(mins / 60);

  return (
    <div>
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <ResponsiveContainer width={150} height={150}>
            <PieChart>
              <Pie data={totalAtt ? slices : [{ name: '—', value: 1, color: 'var(--bg-elevation-2)' }]} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={totalAtt ? 2 : 0} stroke="none">
                {(totalAtt ? slices : [{ color: 'var(--bg-elevation-2)' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5">
          {slices.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-text-sub">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-text-sub">{d.value} ta</span>
                <Badge tone={d.tone}>{pct(d.value)}%</Badge>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-bg-1-alt p-3">
          <p className="text-xs text-text-soft">Jami yig'ilishlar</p>
          <p className="mt-0.5 text-lg font-semibold text-text-strong">{m?.total || 0} ta</p>
        </div>
        <div className="rounded-lg bg-bg-1-alt p-3">
          <p className="text-xs text-text-soft">Sarflangan vaqt</p>
          <p className="mt-0.5 text-lg font-semibold text-text-strong">{hours} soat {mins % 60} daq</p>
        </div>
      </div>
    </div>
  );
}

/** Real monthly income/earning trend (last 6 months) — all values from the API. */
function IncomeTrendCard({ title, data }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data || []} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-sub)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent-sub)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke-soft)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-soft)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-soft)' }} tickFormatter={compact} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [m(v), 'Tushum']} />
            <Area type="monotone" dataKey="value" stroke="var(--accent-strong)" strokeWidth={2} fill="url(#incomeGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** So'nggi loyihalar ro'yxati — to'liq enli, eng pastda. */
function RecentProjectsCard({ projects = [] }) {
  return (
    <Card>
      <CardHeader><CardTitle>So'nggi loyihalar</CardTitle></CardHeader>
      <CardContent>
        {projects.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5 transition-colors hover:bg-bg-1-alt">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                  <p className="text-xs text-text-soft">{formatDate(p.deadline)}</p>
                </div>
                <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-soft">Loyihalar yo'q.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── ADMIN / MANAGER / SUPERADMIN ──
function AdminDashboard({ analytics, aLoading }) {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading } = useDashboard();
  if (isLoading || !data) return <DashSkeleton />;

  const fin = data.finance || {};
  // Menejer Moliya tarixiga kira olmaydi — kartani bosib bo'lmaydigan qoldiramiz (o'lik klik bo'lmasin).
  const expensesTo = role === 'manager' ? undefined : '/finance-history';

  return (
    <div className="space-y-6">
      {/* KPI — bitta tekis qator (5 ta moliya ko'rsatkichi). */}
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(fin.income)} tone="success" to="/reports/projects" /></MItem>
        <MItem><StatCard icon={Coins} label="Kutilayotgan daromad" value={m(fin.expectedIncome)} tone="accent" to="/projects" /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(fin.expenses)} tone="error" to={expensesTo} /></MItem>
        <MItem><StatCard icon={Banknote} label="Oyliklar" value={m(fin.payroll)} tone="neutral" to="/payroll" /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(fin.net)} tone="accent" to="/reports/projects" /></MItem>
      </MotionGrid>

      {/* Vazifalar + Oylik tushum — yonma-yon. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TasksChart data={analytics?.tasks} loading={aLoading} />
        <IncomeTrendCard title="Oylik tushum (so'nggi 6 oy)" data={data.incomeTrend} />
      </div>

      {/* Loyihalar + Yig'ilishlar dinamikasi — yonma-yon. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProjectsChart data={analytics?.projects} loading={aLoading} />
        <MeetingsCard data={analytics?.meetings} loading={aLoading} />
      </div>

      {/* So'nggi loyihalar — eng pastda. */}
      <RecentProjectsCard projects={data.recentProjects} />
    </div>
  );
}

// ── ACCOUNTANT ──
function AccountantDashboard({ analytics, aLoading }) {
  const { data, isLoading } = useDashboard();
  const { data: requests } = useRequests();
  const pending = (requests || []).filter((r) => r.status === 'pending');

  if (isLoading || !data) return <DashSkeleton />;
  const fin = data.finance || {};

  return (
    <div className="space-y-6">
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={Clock} label="To'lovga so'rovlar" value={data.pendingRequests ?? 0} tone="error" to="/finance" /></MItem>
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(fin.income)} tone="success" to="/reports/projects" /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(fin.expenses)} tone="neutral" to="/finance-history" /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(fin.net)} tone="accent" to="/reports/projects" /></MItem>
      </MotionGrid>

      {/* Vazifalar + Oylik tushum — yonma-yon. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TasksChart data={analytics?.tasks} loading={aLoading} />
        <IncomeTrendCard title="Oylik tushum (so'nggi 6 oy)" data={data.incomeTrend} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProjectsChart data={analytics?.projects} loading={aLoading} />
        <MeetingsCard data={analytics?.meetings} loading={aLoading} />
      </div>

      {/* To'lov kutayotgan so'rovlar — eng pastda. */}
      <Card>
        <CardHeader><CardTitle>To'lov kutayotgan so'rovlar</CardTitle></CardHeader>
        <CardContent>
          {pending.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pending.slice(0, 8).map((r) => (
                <Link key={r.id} to="/finance" className="flex items-center justify-between rounded-lg border border-stroke-soft p-3 transition-colors hover:bg-bg-1-alt">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-strong">{r.user?.fullName}</p>
                    <p className="truncate text-xs text-text-soft">{r.reason}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-text-strong">{formatMoney(r.amount, r.currency)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-soft">Kutilayotgan so'rovlar yo'q.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── EMPLOYEE ──
function EmployeeDashboard({ analytics, aLoading }) {
  const { data, isLoading } = useDashboard();
  if (isLoading || !data) return <DashSkeleton />;

  return (
    <div className="space-y-6">
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MItem><StatCard icon={Wallet} label="Mavjud balans" value={m(data.balance)} tone="accent" to="/finance" /></MItem>
        <MItem><StatCard icon={Clock} label="Pending" value={m(data.pending)} tone="neutral" to="/finance" /></MItem>
        <MItem><StatCard icon={Briefcase} label="Loyihalarim" value={data.myProjectCount ?? 0} tone="success" to="/projects" /></MItem>
      </MotionGrid>

      {/* Vazifalar + Oylik daromad — yonma-yon. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TasksChart data={analytics?.tasks} loading={aLoading} />
        <IncomeTrendCard title="Oylik daromad (so'nggi 6 oy)" data={data.earningTrend} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProjectsChart data={analytics?.projects} loading={aLoading} />
        <MeetingsCard data={analytics?.meetings} loading={aLoading} />
      </div>

      {/* Loyihalarim — eng pastda. */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Loyihalarim</CardTitle></CardHeader>
        <CardContent>
          {(data.myProjects || []).length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.myProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5 transition-colors hover:bg-bg-1-alt">
                  <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                  <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-soft">Loyihalar yo'q.</p>
          )}
        </CardContent>
      </Card>
    </div>
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
