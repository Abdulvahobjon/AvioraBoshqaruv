import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { deadlineInfo } from '@/lib/utils/format';

export function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Translate.toString(transform), transition };
  const dl = deadlineInfo(task.deadline);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        'cursor-grab rounded-lg border bg-bg-base p-3 shadow-card active:cursor-grabbing',
        'transition-shadow hover:shadow-elevated',
        isDragging && 'opacity-50',
        task.isOverdue
          ? 'border-2 border-error-strong animate-pulse-error'
          : 'border-stroke-sub',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-strong line-clamp-2">{task.title}</p>
        <Badge tone={TASK_PRIORITY[task.priority]?.tone}>{TASK_PRIORITY[task.priority]?.label}</Badge>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-bg-elevation-2 px-1.5 py-0.5 text-[11px] text-text-sub">{TASK_TYPE[task.type]}</span>
        {task.reopenedCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-error-soft px-1.5 py-0.5 text-[11px] text-error-strong">
            <RotateCcw className="h-3 w-3" /> {task.reopenedCount}x
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-soft">
          {task._count?.comments > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs"><MessageSquare className="h-3.5 w-3.5" />{task._count.comments}</span>
          )}
          {task._count?.files > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs"><Paperclip className="h-3.5 w-3.5" />{task._count.files}</span>
          )}
          {task.deadline && (
            <span className={cn('inline-flex items-center gap-0.5 text-xs', dl.overdue ? 'text-error-strong' : 'text-text-soft')}>
              <Clock className="h-3.5 w-3.5" />{dl.text}
            </span>
          )}
        </div>
        {task.assignee && <Avatar name={task.assignee.fullName} src={task.assignee.avatar} size="sm" />}
      </div>
    </div>
  );
}
