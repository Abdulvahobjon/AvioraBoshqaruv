import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/uz-latn';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Pencil, Trash2, ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import { apiError } from '@/lib/api/axios';
import { DAILY_PLAN_PRIORITY } from '@/lib/constants';
import { useDailyPlans, useToggleDailyPlan, useDeleteDailyPlan } from '@/features/daily-plans/dailyPlansApi';
import { DailyPlanFormDialog } from '@/features/daily-plans/DailyPlanFormDialog';

dayjs.locale('uz-latn');

const todayISO = () => dayjs().format('YYYY-MM-DD');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function DailyPlansPage() {
  const [date, setDate] = useState(todayISO());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useDailyPlans(date);
  const toggle = useToggleDailyPlan();
  const del = useDeleteDailyPlan();

  const plans = data || [];
  const doneCount = useMemo(() => plans.filter((p) => p.isDone).length, [plans]);
  const progress = plans.length ? Math.round((doneCount / plans.length) * 100) : 0;

  const isToday = date === todayISO();
  const shift = (n) => setDate(dayjs(date).add(n, 'day').format('YYYY-MM-DD'));

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  const onToggle = (p) => toggle.mutate({ id: p.id, isDone: !p.isDone }, { onError: (e) => toast.error(apiError(e)) });
  const onDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => { toast.success('Reja o\'chirildi'); setDeleting(null); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-7rem)] w-full flex-col">
      <PageHeader
        title="Kundalik rejalar"
        subtitle="Har kun uchun shaxsiy rejalaringizni belgilang va kuzatib boring"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Yangi reja</Button>}
      />

      {/* Sana navigatsiyasi + progress */}
      <Card className="mb-5 shrink-0 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke-sub text-icon-sub transition-colors hover:bg-bg-1-alt hover:text-icon-strong"
              aria-label="Oldingi kun"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent-strong" />
                <span className="text-base font-semibold text-text-strong">{cap(dayjs(date).format('D MMMM, dddd'))}</span>
                {isToday && <Badge tone="info">Bugun</Badge>}
              </div>
              <span className="text-xs text-text-soft">{dayjs(date).format('YYYY')}-yil</span>
            </div>

            <button
              onClick={() => shift(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stroke-sub text-icon-sub transition-colors hover:bg-bg-1-alt hover:text-icon-strong"
              aria-label="Keyingi kun"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={isToday ? 'secondary' : 'outline'} size="sm" onClick={() => setDate(todayISO())}>Bugun</Button>
            <Button variant="outline" size="sm" onClick={() => setDate(dayjs().add(1, 'day').format('YYYY-MM-DD'))}>Ertaga</Button>
            <div className="w-40">
              <DateTimeBox type="date" value={date} onChange={(v) => v && setDate(v)} />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {plans.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-2">
              <motion.div
                className="h-full rounded-full bg-accent-strong"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-text-sub">{doneCount} / {plans.length} bajarildi</span>
          </div>
        )}
      </Card>

      {/* Rejalar */}
      {isLoading ? (
        <div className="grid flex-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          fill
          icon={CalendarDays}
          title="Bu kun uchun reja yo'q"
          description="Birinchi rejangizni qo'shing va kunni rejalashtirib boshlang."
          action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Reja qo'shish</Button>}
        />
      ) : (
        <div className="grid flex-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <AnimatePresence initial={false}>
            {plans.map((p) => {
              const prio = DAILY_PLAN_PRIORITY[p.priority] || DAILY_PLAN_PRIORITY.medium;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card
                    className={cn('group relative flex h-64 flex-col gap-3 p-4 transition-shadow hover:shadow-elevated', p.isDone && 'opacity-70')}
                    style={{ borderLeft: `3px solid ${prio.dot}` }}
                  >
                    <div className="flex shrink-0 items-start gap-3">
                      <button
                        onClick={() => onToggle(p)}
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          p.isDone ? 'border-accent-strong bg-accent-strong text-text-white' : 'border-stroke-strong text-transparent hover:border-accent-sub',
                        )}
                        aria-label="Bajarildi"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <h3 className={cn('line-clamp-2 flex-1 text-sm font-semibold leading-snug', p.isDone ? 'text-text-soft line-through' : 'text-text-strong')}>
                        {p.title}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEdit(p)} className="rounded p-1.5 text-icon-soft hover:bg-bg-1-alt hover:text-icon-strong" aria-label="Tahrirlash">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleting(p)} className="rounded p-1.5 text-icon-soft hover:bg-error-soft hover:text-error-strong" aria-label="O'chirish">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {p.description ? (
                      <p className={cn('flex-1 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-relaxed', p.isDone ? 'text-text-soft' : 'text-text-sub')}>{p.description}</p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <div className="flex shrink-0 items-center gap-2 pt-1">
                      {p.time && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2.5 py-0.5 text-xs font-medium text-text-sub">
                          <Clock className="h-3 w-3" /> {p.time}
                        </span>
                      )}
                      <Badge tone={prio.tone}>{prio.label}</Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <DailyPlanFormDialog open={formOpen} onClose={() => setFormOpen(false)} plan={editing} defaultDate={date} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Rejani o'chirish"
        message={`"${deleting?.title}" rejasini o'chirmoqchimisiz?`}
        loading={del.isPending}
      />
    </div>
  );
}
