import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Paperclip, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { RHFSelect } from '@/components/ui/RHFSelect';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PercentInput } from '@/components/ui/PercentInput';
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

/** Tanlangan fayl chipi — bosilganda yangi tabda ochiladi; rasm bo'lsa eskiz ko'rsatadi. */
function SelectedFileChip({ file, onRemove }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const isImg = file.type?.startsWith('image/');
  return (
    <div className="flex h-16 w-44 items-center gap-2 rounded-lg border border-stroke-soft p-2 text-xs">
      <a href={url} target="_blank" rel="noreferrer" title="Ochib ko'rish" className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
        {isImg ? (
          <img src={url} alt={file.name} className="h-full w-full cursor-zoom-in object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-md bg-bg-1-alt text-icon-soft"><Paperclip className="h-4 w-4" /></span>
        )}
      </a>
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-text-sub hover:text-text-accent">{file.name}</a>
      <button type="button" onClick={onRemove} className="shrink-0 text-icon-soft hover:text-error-strong"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export function TaskFormDialog({ open, onClose, task, template }) {
  const isEdit = !!task;
  // Qiymatlar manbai: tahrirlash (task) yoki nusxalash (template). Nusxalashda yangi
  // vazifa yaratiladi (isEdit=false), shuning uchun status 'todo' dan boshlanadi.
  const source = task || template;
  const { data: projectList } = useProjects({ limit: 100 });
  const { data: userList } = useUsersList();
  const { data: positions } = useReference('position');
  const save = useSaveTask();
  const upload = useUploadFile();

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    reset(
      source
        ? {
            projectId: source.projectId || '', title: source.title, description: source.description || '',
            status: isEdit ? source.status : 'todo', priority: source.priority, type: source.type,
            assigneeId: source.assigneeId || '', positionId: source.positionId || '',
            sprint: source.sprint || '', price: fromTiyin(source.price), penaltyPercent: source.penaltyPercent || '',
            deadline: isoToLocalInput(source.deadline), estimated: minutesToHHMM(source.estimatedMinutes),
          }
        : {
            projectId: '', title: '', description: '', status: 'todo', priority: 'medium', type: 'feature',
            assigneeId: '', positionId: '', sprint: '', price: '', penaltyPercent: '', deadline: '', estimated: '',
          },
    );
  }, [open, task, template, reset]);

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
      subtitle={isEdit ? "Vazifa ma'lumotlarini yangilang" : "Yangi vazifa ma'lumotlarini to'ldiring"}
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
          <RHFSelect control={control} name="projectId" rules={{ required: true }} error={errors.projectId}>
            <option value="">Loyiha tanlang</option>
            {/* Faqat faol/kechikkan loyihaga vazifa qo'shiladi (tahrirlashda joriy loyiha ham ko'rinadi). */}
            {(projectList?.items || [])
              .filter((p) => ['active', 'overdue'].includes(p.status) || p.id === source?.projectId)
              .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </RHFSelect>
        </FormField>
        <FormField label="Nomi" required error={errors.title && req}>
          <Input placeholder="Nomi yozing" {...register('title', { required: true })} error={errors.title} />
        </FormField>
        <FormField label="Tavsifi" required className="sm:col-span-2" error={errors.description && req}>
          <Textarea placeholder="Tavsifii yozing" {...register('description', { required: true })} error={errors.description} />
        </FormField>

        {isEdit && (
          <FormField label="Holati" className="sm:col-span-2">
            <RHFSelect control={control} name="status">
              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </RHFSelect>
          </FormField>
        )}

        <FormField label="Darajasi" required error={errors.priority && req}>
          <RHFSelect control={control} name="priority" rules={{ required: true }} error={errors.priority}>
            {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </RHFSelect>
        </FormField>
        <FormField label="Turi" required error={errors.type && req}>
          <RHFSelect control={control} name="type" rules={{ required: true }} error={errors.type}>
            {Object.entries(TASK_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </RHFSelect>
        </FormField>

        <FormField label="Topshiruvchi (mas'ul xodim)" className="sm:col-span-2">
          <Controller control={control} name="assigneeId" render={({ field }) => (
            <Select
              value={field.value}
              onChange={(e) => {
                const id = e.target.value;
                field.onChange(id);
                // Xodim tanlanganda uning lavozimi avtomatik belgilanadi.
                const u = users.find((x) => String(x.id) === String(id));
                setValue('positionId', u?.positionId ? String(u.positionId) : '');
              }}
            >
              <option value="">Tanlang</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}{u.position?.name ? ` | ${u.position.name}` : ''}</option>)}
            </Select>
          )} />
        </FormField>

        <FormField label="Kimlar uchun (lavozim)">
          <RHFSelect control={control} name="positionId">
            <option value="">Tanlang</option>
            {(positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </RHFSelect>
        </FormField>
        <FormField label="Sprint tartib raqami" hint="1 dan 10 gacha">
          <Controller name="sprint" control={control} render={({ field }) => (
            <Input
              inputMode="numeric"
              placeholder="1-10"
              value={field.value ?? ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (digits === '') { field.onChange(''); return; }
                field.onChange(String(Math.min(10, Math.max(1, Number(digits)))));
              }}
            />
          )} />
        </FormField>

        <FormField label="Vazifa narxi (UZS)">
          <Controller name="price" control={control} render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} placeholder="0" />} />
        </FormField>
        <FormField label="Jarima foizi (%)">
          <Controller name="penaltyPercent" control={control} render={({ field }) => (
            <PercentInput value={field.value} onChange={field.onChange} placeholder="Jarima" />
          )} />
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
                  <DateTimeBox type="date" value={d} onChange={(v) => field.onChange(v ? `${v}T${t || '23:59'}` : '')} />
                </FormField>
                <FormField label="Muddati (vaqt)">
                  <DateTimeBox type="time" value={t} onChange={(v) => field.onChange(`${d || todayISO()}T${v || '23:59'}`)} />
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
              <SelectedFileChip key={i} file={f} onRemove={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} />
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
