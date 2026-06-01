import { Draggable } from '@hello-pangea/dnd';
import { Calendar, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TASK_PRIORITY } from '@/lib/constants';
import { formatDate, deadlineInfo } from '@/lib/utils/format';

/** Trello-style draggable card with a fixed (uniform) height. */
export function TaskCard({ task, index, onClick }) {
  const dl = task.deadline ? deadlineInfo(task.deadline) : null;
  const priority = TASK_PRIORITY[task.priority];

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(task)}
          className={cn(
            'flex h-[118px] cursor-pointer select-none flex-col overflow-hidden rounded-lg border bg-bg-base p-2.5 shadow-card transition-shadow hover:shadow-elevated',
            snapshot.isDragging && 'shadow-elevated ring-2 ring-stroke-accent',
            task.isOverdue ? 'border-error-strong' : 'border-stroke-sub',
          )}
        >
          {/* Top: priority + reopened */}
          <div className="mb-1 flex items-center gap-1">
            {priority && <Badge tone={priority.tone} className="px-2 py-0 text-[11px]">{priority.label}</Badge>}
            {task.reopenedCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-[#F59E0B]" title="Qayta ochilgan">
                <RotateCcw className="h-3 w-3" />{task.reopenedCount}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="line-clamp-2 text-sm font-medium leading-snug text-text-strong">{task.title}</p>
          {task.uid && <p className="mt-0.5 truncate font-mono text-[10px] text-text-soft">{task.uid}</p>}

          {/* Footer pinned to bottom */}
          <div className="mt-auto flex items-center gap-1.5 pt-1">
            {task.deadline && (
              <span
                className={cn(
                  'inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
                  dl?.overdue ? 'bg-error-soft text-error-strong' : 'bg-bg-2 text-text-sub',
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" /><span className="truncate">{formatDate(task.deadline)}</span>
              </span>
            )}
            {task.assignee && (
              <span className="ml-auto shrink-0" title={task.assignee.fullName}>
                <Avatar name={task.assignee.fullName} src={task.assignee.avatar} size="sm" className="h-6 w-6 text-[10px] ring-2 ring-bg-base" />
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
