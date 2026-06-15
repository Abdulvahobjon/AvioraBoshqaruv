import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Phone, Users, Mail, StickyNote, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select, Textarea } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CLIENT_ACTIVITY } from '@/lib/constants';
import { formatDate } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useAddClientActivity, useDeleteClientActivity } from './clientsApi';

const ICONS = { call: Phone, meeting: Users, email: Mail, note: StickyNote, other: MoreHorizontal };

export function ClientActivitiesTab({ clientId, activities = [], canManage }) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const del = useDeleteClientActivity();

  const confirmDelete = () =>
    del.mutate(
      { clientId, activityId: deleting.id },
      { onSuccess: () => { toast.success('Yozuv o\'chirildi'); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) },
    );

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Yozuv qo'shish</Button>
        </div>
      )}

      {activities.length === 0 ? (
        <EmptyState title="Yozuvlar yo'q" description="Mijoz bilan muloqot tarixini bu yerda yuriting." />
      ) : (
        <div className="space-y-0">
          {activities.map((a, i) => {
            const Icon = ICONS[a.type] || MoreHorizontal;
            const meta = CLIENT_ACTIVITY[a.type] || CLIENT_ACTIVITY.other;
            return (
              <div key={a.id} className="relative flex gap-3 pb-4">
                {i !== activities.length - 1 && <span className="absolute left-[18px] top-9 h-full w-px bg-stroke-soft" />}
                <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-1 text-icon-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-lg border border-stroke-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-xs text-text-soft">{formatDate(a.date, true)}</span>
                    </div>
                    {canManage && (
                      <button className="rounded p-1 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-strong">{a.note}</p>
                  {a.user && <p className="mt-1 text-xs text-text-soft">— {a.user.fullName}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && <ActivityDialog clientId={clientId} onClose={() => setAdding(false)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        message="Bu yozuvni o'chirmoqchimisiz?"
      />
    </div>
  );
}

function ActivityDialog({ clientId, onClose }) {
  const [type, setType] = useState('call');
  const [note, setNote] = useState('');
  const add = useAddClientActivity();

  const submit = () => {
    if (!note.trim()) { toast.error('Izoh kiriting'); return; }
    add.mutate(
      { clientId, type, note: note.trim() },
      { onSuccess: () => { toast.success('Yozuv qo\'shildi'); onClose(); }, onError: (e) => toast.error(apiError(e)) },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Muloqot yozuvi"
      footer={<><Button variant="outline" onClick={onClose}>Bekor qilish</Button><Button onClick={submit} loading={add.isPending}>Saqlash</Button></>}
    >
      <div className="space-y-4">
        <FormField label="Turi">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(CLIENT_ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Izoh" required>
          <Textarea rows={4} placeholder="Nima muhokama qilindi..." value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </div>
    </Dialog>
  );
}
