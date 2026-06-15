import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { useReference, useSaveReference, useDeleteReference } from '@/features/settings/settingsApi';

const MODEL = 'expenseCategory';

export function ExpenseCategoriesPage() {
  const { data, isLoading } = useReference(MODEL);
  const del = useDeleteReference(MODEL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const columns = [
    { key: 'idx', header: '№', render: (_r, i) => <span className="text-text-soft">{i + 1}</span> },
    { key: 'name', header: 'Nomi', render: (r) => <span className="font-medium text-text-strong">{r.name}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="rounded p-1.5 text-icon-sub hover:bg-bg-1-alt" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="h-4 w-4" /></button>
          <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col sm:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Xarajat toifalari"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Toifa qo'shish</Button>}
      />

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={data || []}
          loading={isLoading}
          emptyTitle="Toifalar yo'q"
          emptyDescription="Birinchi xarajat toifasini qo'shing."
          transparent
          fill
        />
      </div>

      <CategoryDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} category={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Toifani o'chirish"
        message={`"${deleting?.name}" toifasini o'chirmoqchimisiz?`}
        loading={del.isPending}
        onConfirm={() => del.mutate(deleting.id, {
          onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); },
          onError: (e) => toast.error(apiError(e)),
        })}
      />
    </div>
  );
}

function CategoryDialog({ open, onClose, category }) {
  const save = useSaveReference(MODEL);
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(category?.name || ''); }, [open, category]);

  const submit = () => {
    if (!name.trim()) { toast.error('Nomini kiriting'); return; }
    save.mutate({ id: category?.id, name: name.trim() }, {
      onSuccess: () => { toast.success(category ? 'Yangilandi' : "Qo'shildi"); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title={category ? 'Toifani tahrirlash' : 'Yangi toifa'}
      subtitle="Xarajat toifasi nomini kiriting"
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Bekor qilish</Button>
          <Button onClick={submit} loading={save.isPending}><Check className="h-4 w-4" /> Saqlash</Button>
        </div>
      }
    >
      <FormField label="Nomi" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Yo'l kira uchun" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </FormField>
    </Dialog>
  );
}
