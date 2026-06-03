import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Wallet, Briefcase, AlertCircle, Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { CLIENT_TYPE, PROJECT_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { useClient } from '@/features/clients/clientsApi';

const CHART_COLORS = ['#3F57B3', '#526ED3', '#7F95E6', '#A9B8F0', '#E02D2D'];

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) return <EmptyState fill title="Mijoz topilmadi" />;

  const s = client.stats;
  const pieData = Object.entries(s.typeBreakdown || {}).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <button onClick={() => navigate('/clients')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-sub hover:text-text-strong">
        <ArrowLeft className="h-4 w-4" /> Mijozlarga qaytish
      </button>

      <PageHeader
        title={client.name}
        subtitle={CLIENT_TYPE[client.type]}
        actions={<Badge tone={client.status === 'active' ? 'success' : 'muted'}>{client.status === 'active' ? 'Faol' : 'Nofaol'}</Badge>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Loyihalar" value={s.projectsCount} hint={`${s.activeProjects} ta faol`} />
        <StatCard icon={Wallet} label="Umumiy tushum" value={formatMoney(s.totalRevenue)} tone="success" />
        <StatCard icon={AlertCircle} label="Qarz (to'lanmagan)" value={formatMoney(s.debt)} tone="error" />
        <StatCard icon={Building2} label="Faol loyihalar" value={s.activeProjects} tone="accent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact + chart */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Aloqa ma'lumotlari</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={Phone} label="Telefon" value={client.phone} />
              <Row icon={Mail} label="Email" value={client.email} />
              <Row icon={MapPin} label="Manzil" value={client.address} />
              <Row icon={Building2} label="Hudud" value={client.region?.name} />
              <Row icon={Briefcase} label="Mas'ul menejer" value={client.manager?.fullName} />
            </CardContent>
          </Card>

          {pieData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Loyiha turlari</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-text-sub">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span className="font-medium text-text-strong">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Projects list */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Loyihalar ({client.projects.length})</CardTitle></CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <EmptyState title="Loyihalar yo'q" description="Bu mijoz uchun hali loyiha yaratilmagan." />
            ) : (
              <div className="space-y-2">
                {client.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-stroke-soft p-3 hover:bg-bg-1-alt"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-strong">{p.name}</p>
                      <p className="text-xs text-text-soft">{p.type?.name} · {formatDate(p.deadline)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium text-text-strong">{formatMoney(p.price, p.currency)}</span>
                      <Badge tone={PAYMENT_STATUS[p.paymentStatus]?.tone}>{PAYMENT_STATUS[p.paymentStatus]?.label}</Badge>
                      <Badge tone={PROJECT_STATUS[p.status]?.tone}>{PROJECT_STATUS[p.status]?.label}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-icon-soft" />
      <span className="w-28 shrink-0 text-text-soft">{label}</span>
      <span className="truncate text-text-strong">{value || '—'}</span>
    </div>
  );
}
