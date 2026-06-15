import { useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import { fileUrl } from '@/features/users/userFields';
import { apiError } from '@/lib/api/axios';
import { useUploadClientFile, useAddClientDocument, useDeleteClientDocument } from './clientsApi';

export function ClientDocumentsTab({ clientId, documents = [], canManage }) {
  const [deleting, setDeleting] = useState(null);
  const uploadFile = useUploadClientFile();
  const addDoc = useAddClientDocument();
  const del = useDeleteClientDocument();

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { url, name } = await uploadFile.mutateAsync(file);
      await addDoc.mutateAsync({ clientId, name: name || file.name, url });
      toast.success('Hujjat yuklandi');
    } catch (err) {
      toast.error(apiError(err, 'Yuklab bo\'lmadi'));
    }
  };

  const confirmDelete = () =>
    del.mutate(
      { clientId, docId: deleting.id },
      { onSuccess: () => { toast.success('Hujjat o\'chirildi'); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) },
    );

  const busy = uploadFile.isPending || addDoc.isPending;

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-accent-strong px-3 text-sm font-medium text-text-white transition-colors hover:bg-accent-sub">
            <Upload className="h-4 w-4" /> {busy ? 'Yuklanmoqda…' : 'Hujjat yuklash'}
            <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={onPick} disabled={busy} />
          </label>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState title="Hujjatlar yo'q" description="Shartnoma yoki boshqa fayllarni bu yerga yuklang." />
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-stroke-soft p-3">
              <a
                href={fileUrl(d.url)}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3 hover:text-text-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-1 text-icon-accent">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-strong">{d.name}</p>
                  <p className="truncate text-xs text-text-soft">
                    {formatDate(d.createdAt)}{d.uploadedBy ? ` · ${d.uploadedBy.fullName}` : ''}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-icon-soft" />
              </a>
              {canManage && (
                <button className="rounded p-1.5 text-error-strong hover:bg-error-soft" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        message={`"${deleting?.name}" hujjatini o'chirmoqchimisiz?`}
      />
    </div>
  );
}
