import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, Wallet, Users, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatMoney, formatDate, deadlineInfo } from '@/lib/utils/format';
import { PROJECT_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useProject } from '@/features/projects/projectsApi';
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = ['superadmin', 'admin'].includes(role);
  const [editOpen, setEditOpen] = useState(false);
  const { data: project, isLoading } = useProject(id);

  if (isLoading) return <ProjectDetailSkeleton />;
  if (!project) return <EmptyState fill title="Loyiha topilmadi" />;

  const dl = deadlineInfo(project.deadline);

  return (
    <div>
      <button onClick={() => navigate('/projects')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-sub hover:text-text-strong">
        <ArrowLeft className="h-4 w-4" /> Loyihalarga qaytish
      </button>

      <PageHeader
        title={project.name}
        subtitle={`${project.type?.name || '—'} · ${project.client?.name || 'Mijozsiz'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={PAYMENT_STATUS[project.paymentStatus]?.tone}>{PAYMENT_STATUS[project.paymentStatus]?.label}</Badge>
            <Badge tone={PROJECT_STATUS[project.status]?.tone}>{PROJECT_STATUS[project.status]?.label}</Badge>
            {canEdit && <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Tahrirlash</Button>}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Summa" value={formatMoney(project.price, project.currency)} />
        <StatCard icon={Calendar} label="Deadline" value={formatDate(project.deadline)} hint={dl.text} tone={dl.overdue ? 'error' : 'accent'} />
        <StatCard icon={ListChecks} label="Vazifalar" value={project._count?.tasks ?? 0} />
        <StatCard icon={Users} label="Jamoa" value={project.members?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Tavsif</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-text-sub">{project.description || 'Tavsif kiritilmagan.'}</p>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-text-sub">Bajarilish</span>
                <span className="font-medium text-text-strong">{project.progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-2">
                <div className="h-full rounded-full bg-accent-strong transition-all" style={{ width: `${project.progressPercent}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Jamoa va ulushlar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(project.members || []).map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={m.user?.fullName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-strong">{m.user?.fullName}</p>
                    <p className="text-xs text-text-soft">{m.roleInProject === 'manager' ? 'Menejer' : 'Xodim'}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-text-strong">{formatMoney(m.shareAmount, m.shareCurrency)}</span>
              </div>
            ))}
            {!project.members?.length && <p className="text-sm text-text-soft">Jamoa biriktirilmagan.</p>}
          </CardContent>
        </Card>
      </div>

      <ProjectFormDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />
    </div>
  );
}

/** Full-layout skeleton matching the project detail page. */
function ProjectDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-5 w-36" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-stroke-sub bg-bg-1 p-5 lg:col-span-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
        </div>
        <div className="space-y-4 rounded-lg border border-stroke-sub bg-bg-1 p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
