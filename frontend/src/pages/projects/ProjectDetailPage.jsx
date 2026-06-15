import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, Wallet, Users, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CopyId } from '@/components/ui/CopyId';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatMoney, formatDate, deadlineInfo } from '@/lib/utils/format';
import { PROJECT_STATUS, PAYMENT_STATUS, TASK_STATUS, TASK_PRIORITY } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useProject } from '@/features/projects/projectsApi';
import { useTasks } from '@/features/tasks/tasksApi';
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
          <div className="flex flex-wrap items-center gap-2">
            {project.isFrozen && <Badge tone="muted">❄ Muzlatilgan</Badge>}
            {project.penaltyPercent != null && <Badge tone="warning">Jarima {project.penaltyPercent}%</Badge>}
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
                    <p className="text-xs text-text-soft">{m.roleInProject === 'manager' ? 'Menejer' : m.roleInProject === 'auditor' ? 'Nazoratchi' : 'Xodim'}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-text-strong">{formatMoney(m.shareAmount, m.shareCurrency)}</span>
              </div>
            ))}
            {!project.members?.length && <p className="text-sm text-text-soft">Jamoa biriktirilmagan.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Sinovchilar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(project.testers || []).map((t) => (
              <div key={t.id} className="flex items-center gap-2.5">
                <Avatar name={t.user?.fullName} src={t.user?.avatar} size="sm" />
                <p className="text-sm font-medium text-text-strong">{t.user?.fullName}</p>
              </div>
            ))}
            {!project.testers?.length && <p className="text-sm text-text-soft">Sinovchi biriktirilmagan.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Loyiha hujjatlari</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(project.documents || []).map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-stroke-soft px-3 py-2 transition-colors hover:bg-bg-1-alt"
              >
                <span className="shrink-0 text-sm font-medium text-text-strong">{d.name}</span>
                <span className="truncate text-xs text-text-accent">{d.url}</span>
              </a>
            ))}
            {!project.documents?.length && <p className="text-sm text-text-soft">Hujjat biriktirilmagan.</p>}
          </CardContent>
        </Card>
      </div>

      <ProjectTasks projectId={id} />

      <ProjectFormDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />
    </div>
  );
}

/** Loyiha vazifalari — status, mas'ul va muddat kesimida ixcham ro'yxat. */
function ProjectTasks({ projectId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useTasks({ projectId, limit: 100 });
  const tasks = data?.items || [];

  return (
    <Card className="mt-6">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Vazifalar {!isLoading && <span className="text-text-soft">({data?.total ?? tasks.length})</span>}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          <ListChecks className="h-4 w-4" /> Vazifalar bo'limi
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : !tasks.length ? (
          <p className="py-6 text-center text-sm text-text-soft">Bu loyihada hali vazifa yo'q.</p>
        ) : (
          <ul className="divide-y divide-stroke-soft">
            {tasks.map((t) => {
              const dl = t.deadline ? deadlineInfo(t.deadline) : null;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {t.uid && <><CopyId value={t.uid} className="text-text-soft" /> · </>}{t.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={TASK_STATUS[t.status]?.tone}>{TASK_STATUS[t.status]?.label || t.status}</Badge>
                      {t.priority && <Badge tone={TASK_PRIORITY[t.priority]?.tone}>{TASK_PRIORITY[t.priority]?.label}</Badge>}
                      {dl && <span className={dl.overdue ? 'text-error-strong' : 'text-text-soft'}>{dl.text}</span>}
                    </div>
                  </div>
                  {t.assignee ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Avatar name={t.assignee.fullName} size="sm" />
                      <span className="hidden text-xs text-text-sub sm:inline">{t.assignee.fullName}</span>
                    </div>
                  ) : (
                    <span className="shrink-0 text-xs text-text-soft">Biriktirilmagan</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
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
