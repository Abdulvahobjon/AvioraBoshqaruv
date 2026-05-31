import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flag, Calendar, Clock, Hourglass, RotateCcw, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, deadlineInfo } from '@/lib/utils/format';

function estimatedText(min) {
  if (!min && min !== 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h ? h + 'h ' : ''}${m}min`;
}

export function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const dl = task.deadline ? deadlineInfo(task.deadline) : null;
  const est = estimatedText(task.estimatedMinutes);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        'cursor-pointer rounded-xl border bg-bg-base p-3.5 shadow-card transition-shadow hover:shadow-elevated',
        isDragging && 'opacity-50',
        task.isOverdue ? 'border-2 border-error-strong animate-pulse-error' : 'border-stroke-sub',
      )}
    >
      <p className="mb-2 text-sm font-bold text-text-strong line-clamp-2">{task.title}</p>

      <div className="space-y-1.5 text-xs text-text-soft">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" />{task.uid || '—'}</span>
          {task.reopenedCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[#F59E0B]"><RotateCcw className="h-3 w-3" />{task.reopenedCount}</span>
          )}
        </div>
        {task.deadline && (
          <div className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(task.deadline, true)}</div>
        )}
        <div className="flex items-center gap-3">
          {est && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{est}</span>}
          {dl && (
            <span className={cn('inline-flex items-center gap-1', dl.overdue ? 'font-medium text-error-strong' : 'text-text-soft')}>
              <Hourglass className="h-3.5 w-3.5" />{dl.text}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-stroke-soft pt-2.5">
        {task.assignee ? (
          <>
            <Avatar name={task.assignee.fullName} src={task.assignee.avatar} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-strong">{task.assignee.fullName}</p>
              <p className="truncate text-[11px] text-text-soft">{task.assignee.position?.name || '—'}</p>
            </div>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-soft"><User className="h-4 w-4" /> Biriktirilmagan</span>
        )}
      </div>
    </div>
  );
}
