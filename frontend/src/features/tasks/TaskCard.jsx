import { Draggable } from '@hello-pangea/dnd';
import { Flag, Calendar, Clock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { CopyId } from '@/components/ui/CopyId';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { formatDate, deadlineInfo } from '@/lib/utils/format';

/** estimatedMinutes → "4h", "1h 30m", "45m". */
function formatEstimate(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Trello-style draggable card: nomi, UID, muddat, taxminiy vaqt va mas'ul xodim. */
export function TaskCard({ task, index, onClick, actions }) {
  const dl = task.deadline ? deadlineInfo(task.deadline) : null;
  const estimate = formatEstimate(task.estimatedMinutes);
  const menuItems = actions?.(task) || [];

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(task)}
          className={cn(
            'relative flex h-[180px] cursor-pointer select-none flex-col overflow-hidden rounded-lg bg-bg-base p-3 shadow-card transition-shadow hover:shadow-elevated',
            snapshot.isDragging && 'shadow-elevated',
          )}
        >
          {/* O'ng yuqori burchak: qayta ochilgan belgisi + kebab (⋮) menyu */}
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
            {task.reopenedCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-warning-strong" title="Qayta ochilgan">
                <RotateCcw className="h-3 w-3" />{task.reopenedCount}
              </span>
            )}
            {menuItems.length > 0 && (
              // Sudrashni va karta bosilishini boshlamasligi uchun event'larni to'xtatamiz.
              <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenu items={menuItems} />
              </div>
            )}
          </div>

          {/* Nomi */}
          <p className="line-clamp-2 pr-12 text-sm font-semibold leading-snug text-text-strong">{task.title}</p>

          {/* Meta: UID · muddat · taxminiy vaqt */}
          <div className="mt-2.5 space-y-1.5 text-xs">
            {task.uid && (
              <div className="flex items-center gap-1.5 text-text-sub">
                <Flag className="h-3.5 w-3.5 shrink-0 text-icon-soft" />
                <CopyId value={task.uid} />
              </div>
            )}
            {task.deadline && (
              <div className={cn('flex items-center gap-1.5', dl?.overdue ? 'text-error-strong' : 'text-text-sub')}>
                <Calendar className="h-3.5 w-3.5 shrink-0 text-icon-soft" />
                <span>{formatDate(task.deadline, true)}</span>
              </div>
            )}
            {estimate && (
              <div className="flex items-center gap-1.5 text-text-sub">
                <Clock className="h-3.5 w-3.5 shrink-0 text-icon-soft" />
                <span>{estimate}</span>
              </div>
            )}
          </div>

          {/* Mas'ul xodim — doim kartaning pastiga yopishadi (bir xil balandlik uchun) */}
          {task.assignee && (
            <div className="mt-auto flex items-center gap-2 border-t border-stroke-soft pt-2.5">
              <Avatar name={task.assignee.fullName} src={task.assignee.avatar} size="sm" className="h-7 w-7 shrink-0 text-[10px]" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-text-strong">{task.assignee.fullName}</p>
                {task.assignee.position?.name && (
                  <p className="truncate text-[11px] text-text-soft">{task.assignee.position.name}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
