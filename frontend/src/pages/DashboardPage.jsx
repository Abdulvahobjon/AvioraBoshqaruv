import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, AlertTriangle, CheckCircle2, Wallet, Clock,
  TrendingUp, TrendingDown, Banknote, ListChecks, Coins,
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
import { useDashboard } from '@/features/reports/reportsApi';
import { useRequests } from '@/features/finance/financeApi';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

function MotionGrid({ children, className }) {
  return <motion.div variants={stagger} initial="hidden" animate="show" className={className}>{children}</motion.div>;
}
function MItem({ children }) {
  return <motion.div variants={item}>{children}</motion.div>;
}

// money: backend returns whole-unit so'm; formatMoney expects tiyin → ×100.
const m = (v) => formatMoney(Math.round((v || 0) * 100));
const compact = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' mln' : v >= 1e3 ? Math.round(v / 1e3) + ' ming' : String(v || 0));

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

/** Real monthly income/earning trend (last 6 months) — all values from the API. */
function IncomeTrendCard({ title, data }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data || []}>
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

// ── ADMIN / MANAGER / SUPERADMIN ──
function AdminDashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading || !data) return <DashSkeleton />;

  const fin = data.finance || {};
  const pc = data.projectCounts || {};
  const statusData = Object.entries(PROJECT_STATUS).map(([k, v]) => ({ name: v.label, value: pc[k] || 0 }));

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(fin.income)} tone="success" to="/reports" /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(fin.expenses)} tone="error" to="/expenses" /></MItem>
        <MItem><StatCard icon={Banknote} label="Oyliklar" value={m(fin.payroll)} tone="neutral" to="/payroll" /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(fin.net)} tone="accent" to="/reports" /></MItem>
      </MotionGrid>

      <MotionGrid className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={Coins} label="Kutilayotgan daromad" value={m(fin.expectedIncome)} tone="accent" to="/projects" /></MItem>
        <MItem><StatCard icon={Briefcase} label="Faol loyihalar" value={pc.active || 0} tone="accent" to="/projects" /></MItem>
        <MItem><StatCard icon={AlertTriangle} label="Kechikkan" value={pc.overdue || 0} tone="error" to="/projects" /></MItem>
        <MItem><StatCard icon={CheckCircle2} label="Yakunlangan" value={pc.completed || 0} tone="success" to="/projects" /></MItem>
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
            {(data.recentProjects || []).map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5 transition-colors hover:bg-bg-1-alt">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                  <p className="text-xs text-text-soft">{formatDate(p.deadline)}</p>
                </div>
                <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
              </Link>
            ))}
            {!(data.recentProjects || []).length && <p className="text-sm text-text-soft">Loyihalar yo'q.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <IncomeTrendCard title="Oylik tushum (so'nggi 6 oy)" data={data.incomeTrend} />
      </div>
    </>
  );
}

// ── ACCOUNTANT ──
function AccountantDashboard() {
  const { data, isLoading } = useDashboard();
  const { data: requests } = useRequests();
  const pending = (requests || []).filter((r) => r.status === 'pending');

  if (isLoading || !data) return <DashSkeleton />;
  const fin = data.finance || {};

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MItem><StatCard icon={Clock} label="To'lovga so'rovlar" value={data.pendingRequests ?? 0} tone="error" to="/finance" /></MItem>
        <MItem><StatCard icon={TrendingUp} label="Tushum" value={m(fin.income)} tone="success" to="/reports" /></MItem>
        <MItem><StatCard icon={TrendingDown} label="Xarajatlar" value={m(fin.expenses)} tone="neutral" to="/expenses" /></MItem>
        <MItem><StatCard icon={Wallet} label="Sof foyda" value={m(fin.net)} tone="accent" to="/reports" /></MItem>
      </MotionGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeTrendCard title="Oylik tushum (so'nggi 6 oy)" data={data.incomeTrend} />
        <Card>
          <CardHeader><CardTitle>To'lov kutayotgan so'rovlar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 8).map((r) => (
              <Link key={r.id} to="/finance" className="flex items-center justify-between rounded-lg border border-stroke-soft p-3 transition-colors hover:bg-bg-1-alt">
                <div>
                  <p className="text-sm font-medium text-text-strong">{r.user?.fullName}</p>
                  <p className="text-xs text-text-soft">{r.reason}</p>
                </div>
                <span className="font-semibold text-text-strong">{formatMoney(r.amount, r.currency)}</span>
              </Link>
            ))}
            {!pending.length && <p className="text-sm text-text-soft">Kutilayotgan so'rovlar yo'q.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── EMPLOYEE ──
function EmployeeDashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading || !data) return <DashSkeleton />;

  return (
    <>
      <MotionGrid className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MItem><StatCard icon={Wallet} label="Mavjud balans" value={m(data.balance)} tone="accent" to="/finance" /></MItem>
        <MItem><StatCard icon={Clock} label="Pending" value={m(data.pending)} tone="neutral" to="/finance" /></MItem>
        <MItem><StatCard icon={Briefcase} label="Loyihalarim" value={data.myProjectCount ?? 0} tone="success" to="/projects" /></MItem>
      </MotionGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeTrendCard title="Oylik daromad (so'nggi 6 oy)" data={data.earningTrend} />
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Loyihalarim</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data.myProjects || []).map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-stroke-soft p-2.5 transition-colors hover:bg-bg-1-alt">
                <p className="truncate text-sm font-medium text-text-strong">{p.name}</p>
                <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
              </Link>
            ))}
            {!(data.myProjects || []).length && <p className="text-sm text-text-soft">Loyihalar yo'q.</p>}
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
