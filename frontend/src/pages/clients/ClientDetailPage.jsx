import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Wallet, Briefcase, AlertCircle, Building2,
  Pencil, LayoutGrid, Users, Activity, FileText,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatMoney, formatDate } from '@/lib/utils/format';
import { CLIENT_TYPE, PROJECT_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { useClient } from '@/features/clients/clientsApi';
import { formatPhone } from '@/components/ui/PhoneInput';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { ClientPaymentsTab } from '@/features/clients/ClientPaymentsTab';
import { ClientContactsTab } from '@/features/clients/ClientContactsTab';
import { ClientActivitiesTab } from '@/features/clients/ClientActivitiesTab';
import { ClientDocumentsTab } from '@/features/clients/ClientDocumentsTab';

const CHART_COLORS = ['#3F57B3', '#526ED3', '#7F95E6', '#A9B8F0', '#E02D2D'];

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const can = useCan();
  const canUpdate = can('clients.update');
  const canDeletePayment = can('clients.delete');
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);

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

  const s = client.stats || {};
  const projects = client.projects || [];
  const payments = client.payments || [];
  const contacts = client.contacts || [];
  const activities = client.activities || [];
  const documents = client.documents || [];
  const pieData = Object.entries(s.typeBreakdown || {}).map(([name, value]) => ({ name, value }));

  const tabs = [
    { value: 'overview', label: 'Umumiy', icon: LayoutGrid },
    { value: 'payments', label: "To'lovlar", icon: Wallet, badge: payments.length || null },
    { value: 'contacts', label: 'Kontaktlar', icon: Users, badge: contacts.length || null },
    { value: 'activities', label: 'Faoliyat', icon: Activity, badge: activities.length || null },
    { value: 'documents', label: 'Hujjatlar', icon: FileText, badge: documents.length || null },
  ];

  return (
    <div>
      <button onClick={() => navigate('/clients')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-sub hover:text-text-strong">
        <ArrowLeft className="h-4 w-4" /> Mijozlarga qaytish
      </button>

      <PageHeader
        title={client.name}
        subtitle={CLIENT_TYPE[client.type]}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={client.status === 'active' ? 'success' : 'muted'}>{client.status === 'active' ? 'Faol' : 'Nofaol'}</Badge>
            {canUpdate && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Tahrirlash</Button>}
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Loyihalar" value={s.projectsCount} hint={`${s.activeProjects} ta faol`} />
        <StatCard icon={Wallet} label="Umumiy tushum" value={formatMoney(s.totalRevenue)} tone="success" />
        <StatCard icon={AlertCircle} label="Qarz (to'lanmagan)" value={formatMoney(s.debt)} tone="error" />
        <StatCard icon={Wallet} label="Qabul qilingan to'lovlar" value={formatMoney(s.paymentsTotal)} tone="accent" />
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Contact + chart */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Aloqa ma'lumotlari</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row icon={Phone} label="Telefon" value={formatPhone(client.phone)} />
                <Row icon={Mail} label="Email" value={client.email} />
                <Row icon={MapPin} label="Manzil" value={client.address} />
                <Row icon={Building2} label="Hudud" value={client.region?.name} />
                <Row icon={Briefcase} label="Mas'ul menejer" value={client.manager?.fullName} />
                {client.note && <Row icon={FileText} label="Izoh" value={client.note} />}
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
            <CardHeader><CardTitle>Loyihalar ({projects.length})</CardTitle></CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <EmptyState title="Loyihalar yo'q" description="Bu mijoz uchun hali loyiha yaratilmagan." />
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => (
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
      )}

      {tab === 'payments' && (
        <ClientPaymentsTab
          clientId={client.id}
          payments={payments}
          projects={projects}
          totalPaid={s.paymentsTotal}
          canAdd={canUpdate}
          canDelete={canDeletePayment}
        />
      )}
      {tab === 'contacts' && <ClientContactsTab clientId={client.id} contacts={contacts} canManage={canUpdate} />}
      {tab === 'activities' && <ClientActivitiesTab clientId={client.id} activities={activities} canManage={canUpdate} />}
      {tab === 'documents' && <ClientDocumentsTab clientId={client.id} documents={documents} canManage={canUpdate} />}

      <ClientFormDialog open={editing} onClose={() => setEditing(false)} client={client} />
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
