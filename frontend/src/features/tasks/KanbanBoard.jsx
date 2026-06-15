import { useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { useCan } from '@/lib/permissions';
import { KanbanColumn } from './KanbanColumn';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

// Status faqat OLDINGA siljiydi. 'overdue' = jarayon darajasi (kechikkan, lekin jarayonda).
// 'overdue' qo'lda qo'yilmaydi (avtomatik), 'checked'/'rejected' — faqat tekshiruv orqali.
const RANK = { todo: 1, in_progress: 2, overdue: 2, done: 3, production: 4 };

/** Faqat oldinga siljish ruxsat etilgan (orqaga va overdue/checked/rejected ustuniga tashlash taqiqlangan). */
function isForwardMove(from, to) {
  if (from === to) return true; // bir ustun ichida (no-op)
  if (to === 'overdue' || to === 'checked' || to === 'rejected') return false; // bu ustunlarga qo'lda tashlab bo'lmaydi
  const f = RANK[from];
  const t = RANK[to];
  return !!f && !!t && t > f; // faqat oldinga (overdue→done ham mumkin)
}

/** Trello-like board powered by @hello-pangea/dnd (react-beautiful-dnd fork). */
export function KanbanBoard({ tasks, onCardClick, actions, onAddCard, canAdd }) {
  const changeStatus = useChangeStatus();
  const [draggingFrom, setDraggingFrom] = useState(null); // sudralayotgan kartaning manba statusi
  const canWork = useCan()('tasks.work'); // auditor (faqat-o'qish) statusni o'zgartira olmaydi

  const grouped = useMemo(() => {
    const g = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.status, []]));
    for (const t of tasks) (g[t.status] || (g[t.status] = [])).push(t);
    return g;
  }, [tasks]);

  const onDragStart = (start) => setDraggingFrom(start.source.droppableId);

  const onDragEnd = (result) => {
    setDraggingFrom(null);
    if (!canWork) return; // auditor — statusni o'zgartirib bo'lmaydi (backend ham bloklaydi)
    const { source, destination, draggableId } = result;
    if (!destination) return; // dropped outside any list
    if (source.droppableId === destination.droppableId) return; // same column — reorder snaps back
    // Faqat oldinga (himoya: isDropDisabled ham bloklaydi, bu esa zaxira tekshiruv). Hamma uchun, superadmin ham.
    if (!isForwardMove(source.droppableId, destination.droppableId)) {
      toast.error('Vazifa statusi faqat oldinga siljiydi');
      return;
    }
    changeStatus.mutate(
      { id: Number(draggableId), status: destination.droppableId },
      { onError: (err) => toast.error(apiError(err, 'Statusni o\'zgartirib bo\'lmadi')) },
    );
  };

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* Shaffof tashqi konteyner — sahifa foni ko'rinadi; ustunlar kulrang qoladi. */}
      <div className="h-full overflow-hidden">
        {/* Mobil/planshetda ustunlar siqilmasin — gorizontal scroll bilan to'liq ko'rinadi. */}
        <div className="flex h-full gap-2 overflow-x-auto scrollbar-none">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={grouped[col.status] || []}
              onCardClick={onCardClick}
              actions={actions}
              onAddCard={onAddCard}
              canAdd={canAdd}
              // Sudrash paytida faqat oldinga ruxsat etilgan ustunlar yoniq qoladi.
              dropDisabled={draggingFrom != null && !isForwardMove(draggingFrom, col.status)}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
