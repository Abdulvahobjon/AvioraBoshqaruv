import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { useSaveReference } from './settingsApi';

/** Small modal to quickly add a reference item (e.g. a project type) and select it. */
export function QuickReferenceDialog({ open, onClose, model, title, label, onCreated }) {
  const save = useSaveReference(model);
  const [name, setName] = useState('');

  useEffect(() => { if (open) setName(''); }, [open]);

  const submit = () => {
    if (!name.trim()) { toast.error('Nom kiriting'); return; }
    save.mutate({ name: name.trim() }, {
      onSuccess: (created) => { toast.success('Qo\'shildi'); onCreated?.(created); onClose(); },
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Ro'yxatga yangi qiymat qo'shing"
      size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Bekor</Button><Button onClick={submit} loading={save.isPending}>Qo'shish</Button></>}
    >
      <FormField label={label}>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </FormField>
    </Dialog>
  );
}
