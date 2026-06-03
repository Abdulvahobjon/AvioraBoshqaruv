import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Paperclip, Plus, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { FormField } from '@/components/ui/FormField';
import { apiError } from '@/lib/api/axios';
import { toTiyin, fromTiyin } from '@/lib/utils/format';
import { TASK_PRIORITY, TASK_TYPE, TASK_STATUS } from '@/lib/constants';
import { useReference } from '@/features/settings/settingsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useProjects } from '@/features/projects/projectsApi';
import { useSaveTask, useUploadFile } from './tasksApi';

function minutesToHHMM(m) {
  if (!m && m !== 0) return '';
  const h = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${h}:${mm}`;
}
function hhmmToMinutes(v) {
  if (!v) return undefined;
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
// Saqlangan ISO (UTC) ni <input type="datetime-local"> uchun LOKAL "YYYY-MM-DDTHH:mm" ga.
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function TaskFormDialog({ open, onClose, task }) {
  const isEdit = !!task;
  const { data: projectList } = useProjects({ limit: 100 });
  const { data: userList } = useUsersList();
  const { data: positions } = useReference('position');
  const save = useSaveTask();
  const upload = useUploadFile();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    reset(
      task
        ? {
            projectId: task.projectId || '', title: task.title, description: task.description || '',
            status: task.status, priority: task.priority, type: task.type,
            assigneeId: task.assigneeId || '', positionId: task.positionId || '',
            sprint: task.sprint || '', price: fromTiyin(task.price), penaltyPercent: task.penaltyPercent || '',
            deadline: isoToLocalInput(task.deadline), estimated: minutesToHHMM(task.estimatedMinutes),
          }
        : {
            projectId: '', title: '', description: '', status: 'todo', priority: 'medium', type: 'feature',
            assigneeId: '', positionId: '', sprint: '', price: '', penaltyPercent: '', deadline: '', estimated: '',
          },
    );
  }, [open, task, reset]);

  const users = userList?.items || [];

  const onSubmit = async (v) => {
    const payload = {
      projectId: Number(v.projectId),
      title: v.title,
      description: v.description || undefined,
      status: v.status,
      priority: v.priority,
      type: v.type,
      assigneeId: v.assigneeId ? Number(v.assigneeId) : undefined,
      positionId: v.positionId ? Number(v.positionId) : undefined,
      sprint: v.sprint ? Number(v.sprint) : undefined,
      price: toTiyin(v.price || 0),
      penaltyPercent: v.penaltyPercent ? Number(v.penaltyPercent) : undefined,
      // Lokal vaqtni absolyut ISO (UTC) ga aylantiramiz — backend to'g'ri saqlaydi (±5 soat siljish yo'q).
      deadline: v.deadline ? new Date(v.deadline).toISOString() : undefined,
      estimatedMinutes: hhmmToMinutes(v.estimated),
    };
    try {
      const saved = await save.mutateAsync({ id: task?.id, ...payload });
      // Upload any selected files to the created/edited task
      for (const f of files) {
        await upload.mutateAsync({ id: saved.id, file: f });
      }
      toast.success(isEdit ? 'Vazifa yangilandi' : 'Vazifa yaratildi');
      onClose();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const req = '*Bu maydon majburiy';
  const loading = save.isPending || upload.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onBack={onClose}
      title={isEdit ? 'Vazifa tahrirlash' : 'Vazifa qo\'shish'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Yopish</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={loading}>{isEdit ? 'Tahrirlash' : 'Qo\'shish'}</Button>
        </>
      }
    >
      <p className="-mt-2 mb-4 text-sm text-text-sub">
        {isEdit ? 'Vazifa ma\'lumotlarini yangilash uchun o\'zgartirishlar kiriting' : 'Yangi vazifa yaratish uchun ma\'lumotlarni kiriting'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Loyiha" required error={errors.projectId && req}>
          <Select {...register('projectId', { required: true })} error={errors.projectId}>
            <option value="">Loyiha tanlang</option>
            {(projectList?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Nomi" required error={errors.title && req}>
          <Input placeholder="Nomi yozing" {...register('title', { required: true })} error={errors.title} />
        </FormField>
        <FormField label="Tavsifi" required className="sm:col-span-2" error={errors.description && req}>
          <Textarea placeholder="Tavsifii yozing" {...register('description', { required: true })} error={errors.description} />
        </FormField>

        {isEdit && (
          <FormField label="Holati" className="sm:col-span-2">
            <Select {...register('status')}>
              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </FormField>
        )}

        <FormField label="Darajasi" required error={errors.priority && req}>
          <Select {...register('priority', { required: true })} error={errors.priority}>
            {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Turi" required error={errors.type && req}>
          <Select {...register('type', { required: true })} error={errors.type}>
            {Object.entries(TASK_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormField>

        <FormField label="Topshiruvchi (mas'ul xodim)" className="sm:col-span-2">
          <Select {...register('assigneeId')}>
            <option value="">Tanlang</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}{u.position?.name ? ` | ${u.position.name}` : ''}</option>)}
          </Select>
        </FormField>

        <FormField label="Kimlar uchun (lavozim)">
          <Select {...register('positionId')}>
            <option value="">Tanlang</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Sprint tartib raqami">
          <Input type="number" min="0" placeholder="0" {...register('sprint')} />
        </FormField>

        <FormField label="Vazifa narxi (UZS)">
          <Controller name="price" control={control} render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} placeholder="0" />} />
        </FormField>
        <FormField label="Jarima foizi (%)">
          <Input type="number" min="0" placeholder="Jarima" {...register('penaltyPercent')} />
        </FormField>

        <Controller
          name="deadline"
          control={control}
          render={({ field }) => {
            const [d, t] = (field.value || '').split('T');
            const todayISO = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
            return (
              <>
                <FormField label="Muddati (sana)">
                  <DateTimeBox type="date" value={d} onChange={(v) => field.onChange(v ? `${v}T${t || '00:00'}` : '')} />
                </FormField>
                <FormField label="Muddati (vaqt)">
                  <DateTimeBox type="time" value={t} onChange={(v) => field.onChange(`${d || todayISO()}T${v || '00:00'}`)} />
                </FormField>
              </>
            );
          }}
        />
        <FormField label="Taxminiy vaqt (soat:daqiqa)">
          <Controller name="estimated" control={control} render={({ field }) => <DateTimeBox type="time" value={field.value} onChange={field.onChange} />} />
        </FormField>

        {/* Files */}
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-text-sub">Qo'shimcha fayllar</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex h-16 w-44 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stroke-accent text-sm text-text-accent hover:bg-bg-1-alt">
              <Paperclip className="h-4 w-4" /> Fayl yuklash
              <input type="file" multiple className="hidden" onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])} />
            </label>
            {files.map((f, i) => (
              <div key={i} className="flex h-16 w-44 items-center justify-between gap-2 rounded-lg border border-stroke-soft px-3 text-xs">
                <span className="truncate text-text-sub">{f.name}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-icon-soft hover:text-error-strong"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {files.length < 2 && (
              <div className="flex h-16 w-44 items-center justify-center rounded-lg border border-dashed border-stroke-sub text-icon-soft">
                <Plus className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
