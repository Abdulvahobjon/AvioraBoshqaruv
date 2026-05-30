import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { TASK_PRIORITY, TASK_TYPE } from '@/lib/constants';
import { useReference } from '@/features/settings/settingsApi';
import { useSaveTask } from './tasksApi';

export function TaskFormDialog({ open, onClose, projectId, members = [], task }) {
  const isEdit = !!task;
  const { data: positions } = useReference('position');
  const save = useSaveTask(projectId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(
      task
        ? {
            title: task.title, description: task.description || '', assigneeId: task.assigneeId || '',
            priority: task.priority, type: task.type, positionId: task.positionId || '',
            deadline: task.deadline ? task.deadline.slice(0, 10) : '', estimatedMinutes: task.estimatedMinutes || '',
          }
        : { title: '', description: '', assigneeId: '', priority: 'medium', type: 'feature', positionId: '', deadline: '', estimatedMinutes: '' },
    );
  }, [open, task, reset]);

  const onSubmit = (values) => {
    const payload = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      assigneeId: values.assigneeId ? Number(values.assigneeId) : undefined,
      priority: values.priority,
      type: values.type,
      positionId: values.positionId ? Number(values.positionId) : undefined,
      deadline: values.deadline || undefined,
      estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : undefined,
    };
    save.mutate(
      { id: task?.id, ...payload },
      {
        onSuccess: () => { toast.success(isEdit ? 'Vazifa yangilandi' : 'Vazifa yaratildi'); onClose(); },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Vazifani tahrirlash' : 'Yangi vazifa'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={save.isPending}>Saqlash</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Sarlavha" required className="sm:col-span-2" error={errors.title && 'Sarlavha kiriting'}>
          <Input {...register('title', { required: true })} error={errors.title} />
        </FormField>
        <FormField label="Tavsif" className="sm:col-span-2">
          <Textarea {...register('description')} placeholder="Markdown qo'llab-quvvatlanadi" />
        </FormField>
        <FormField label="Mas'ul xodim">
          <Select {...register('assigneeId')}>
            <option value="">— Tanlang —</option>
            {members.map((m) => <option key={m.userId || m.id} value={m.userId || m.id}>{m.user?.fullName || m.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Lavozim">
          <Select {...register('positionId')}>
            <option value="">— Tanlang —</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Muhimlik">
          <Select {...register('priority')}>
            {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Turi">
          <Select {...register('type')}>
            {Object.entries(TASK_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>
        <FormField label="Deadline">
          <Input type="date" {...register('deadline')} />
        </FormField>
        <FormField label="Rejalashtirilgan (daqiqa)">
          <Input type="number" min="0" {...register('estimatedMinutes')} />
        </FormField>
      </form>
    </Dialog>
  );
}
