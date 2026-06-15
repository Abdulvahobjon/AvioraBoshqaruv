import { useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/lib/permissions';
import { KanbanColumn } from './KanbanColumn';
import { useChangeStatus } from './tasksApi';
import { apiError } from '@/lib/api/axios';

// Statusni faqat BITTADAN OLDINGA siljitish mumkin: todo→in_progress→done→production.
// 'checked'/'rejected' faqat review (Ishga tushirilgan ustunida) orqali, 'overdue' avtomatik.
const PIPELINE = ['todo', 'in_progress', 'done', 'production'];

/** Faqat keyingi bitta bosqichga siljish ruxsat etilgan (sakrash/orqaga = taqiqlangan). */
function isForwardMove(from, to) {
  if (from === to) return true; // bir ustun ichida (no-op)
  const ti = PIPELINE.indexOf(to);
  const fi = PIPELINE.indexOf(from);
  return ti !== -1 && ti === fi + 1; // faqat darhol keyingi ustun
}

/** Trello-like board powered by @hello-pangea/dnd (react-beautiful-dnd fork). */
export function KanbanBoard({ tasks, onCardClick, actions, onAddCard, canAdd }) {
  const changeStatus = useChangeStatus();
  const [draggingFrom, setDraggingFrom] = useState(null); // sudralayotgan kartaning manba statusi
  // Superadmin — hammasi ochiq: istalgan ustunga (sakrash/orqaga) erkin sudraydi.
  const canMoveAny = useAuthStore((s) => s.user?.role) === 'superadmin';
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
    // Faqat oldinga (himoya: isDropDisabled ham bloklaydi, bu esa zaxira tekshiruv).
    // Superadmin uchun cheklov yo'q.
    if (!canMoveAny && !isForwardMove(source.droppableId, destination.droppableId)) {
      toast.error('Statusni faqat bittadan keyingi bosqichga siljitish mumkin');
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
              // Sudrash paytida faqat oldinga ruxsat etilgan ustunlar yoniq qoladi (superadmin'ga hammasi).
              dropDisabled={!canMoveAny && draggingFrom != null && !isForwardMove(draggingFrom, col.status)}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
