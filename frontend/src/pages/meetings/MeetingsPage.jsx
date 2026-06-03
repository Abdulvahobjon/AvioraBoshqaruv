import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Plus, X, UserPlus, Eye, CheckCircle2, Trash2, Video, Search, Filter, Copy, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { DateTimeBox } from '@/components/ui/DateTimeBox';
import { Avatar } from '@/components/ui/Avatar';
import { Switch } from '@/components/ui/Switch';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import { formatDate, deadlineInfo } from '@/lib/utils/format';
import { apiError } from '@/lib/api/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/authStore';
import { useProjects } from '@/features/projects/projectsApi';
import { useUsersList } from '@/features/users/usersApi';
import { useMeetings, useCreateMeeting, useUpdateMeeting, useDeleteMeeting } from '@/features/meetings/meetingsApi';
import { ParticipantPicker } from '@/features/meetings/ParticipantPicker';
import { MeetingDetailDialog } from '@/features/meetings/MeetingDetailDialog';
import { AttendanceDialog } from '@/features/meetings/AttendanceDialog';
import { MeetingStatusBadge } from '@/features/meetings/MeetingStatusBadge';

const hasFilters = (f) => Object.values(f).some(Boolean);

/** Ishtirokchilar avatarlarini zич (overlapping) ko'rsatadi; ortig'ini "+N" qiladi. */
function AvatarStack({ people = [], max = 4 }) {
  if (!people.length) return <span className="text-text-soft">—</span>;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center" title={people.map((p) => p.fullName).join(', ')}>
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar key={p.id} name={p.fullName} src={p.avatar} size="sm" className="ring-2 ring-bg-1" />
        ))}
      </div>
      {rest > 0 && <span className="ml-2 text-xs font-medium text-text-soft">+{rest}</span>}
    </div>
  );
}

export function MeetingsPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = ['superadmin', 'admin', 'manager'].includes(user?.role);
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState({ organizerId: '', projectId: '', status: '', from: '', to: '' });
  const [sort, setSort] = useState('newest');
  const [filterOpen, setFilterOpen] = useState(false);

  const query = {
    search: debounced || undefined,
    organizerId: filters.organizerId || undefined,
    projectId: filters.projectId || undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
    sort,
  };
  const { data: meetings, isLoading } = useMeetings(query);
  const del = useDeleteMeeting();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [attendanceId, setAttendanceId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canManage = (m) => m.createdBy === user?.id || isAdmin;
  // Tahrirlash: faqat o'zi yaratgan va hali yakunlanmagan yig'ilish.
  const canEdit = (m) => m.createdBy === user?.id && !m.finishedAt;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const columns = [
    { key: 'idx', header: '№', className: 'w-12', render: (_r, i) => i + 1 },
    { key: 'uid', header: 'UID', render: (r) => <span className="font-mono text-xs text-text-sub">{r.uid || '—'}</span> },
    {
      key: 'title', header: 'Nomi',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-text-strong">{r.title}</span>
          {r.meetLink && (
            <a href={r.meetLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Google Meet'ga kirish" className="text-accent-strong hover:text-accent-sub">
              <Video className="h-4 w-4" />
            </a>
          )}
        </span>
      ),
    },
    { key: 'creator', header: 'Tashkilotchi', render: (r) => r.creator?.fullName || '—' },
    { key: 'project', header: 'Loyiha', render: (r) => r.project?.name || 'Umumiy' },
    {
      key: 'startAt', header: 'Boshlanish vaqti',
      render: (r) => {
        const info = !r.finishedAt ? deadlineInfo(r.startAt) : null;
        return (
          <div className="leading-tight">
            <div className="whitespace-nowrap text-text-strong">{formatDate(r.startAt, true)}</div>
            {info && <div className={cn('text-xs', info.overdue ? 'text-error-strong' : 'text-text-soft')}>{info.text}</div>}
          </div>
        );
      },
    },
    {
      key: 'participants', header: 'Ishtirokchilar',
      render: (r) => <AvatarStack people={(r.attendance || []).map((a) => a.user).filter(Boolean)} />,
    },
    { key: 'status', header: 'Holati', render: (r) => <MeetingStatusBadge meeting={r} /> },
    {
      key: 'actions', header: '', className: 'w-12',
      render: (r) => {
        const items = [{ label: "Ko'rish", icon: Eye, onClick: () => setDetailId(r.id) }];
        if (canEdit(r)) items.push({ label: 'Tahrirlash', icon: Pencil, onClick: () => setEditing(r) });
        if (canManage(r) && !r.finishedAt) items.push({ label: 'Yakunlash', icon: CheckCircle2, tone: 'success', onClick: () => setAttendanceId(r.id) });
        if (canManage(r)) items.push({ label: "O'chirish", icon: Trash2, tone: 'danger', onClick: () => setDeleting(r) });
        return <div onClick={(e) => e.stopPropagation()}><DropdownMenu items={items} /></div>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Yig'ilishlar"
        subtitle="Uchrashuvlar, davomat va yakunlash"
        actions={canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Yig'ilish qo'shish</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon-soft" />
          <Input placeholder="Nomi bo'yicha izlash..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40">
            <option value="newest">Yangi → Eski</option>
            <option value="oldest">Eski → Yangi</option>
          </Select>
          <Button variant="outline" onClick={() => setFilterOpen(true)} className="relative">
            <Filter className="h-4 w-4" /> Filtrlash
            {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] text-text-white">{activeFilterCount}</span>}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={meetings}
        loading={isLoading}
        onRowClick={(r) => (canEdit(r) ? setEditing(r) : setDetailId(r.id))}
        emptyTitle="Yig'ilishlar yo'q"
        emptyDescription={canCreate ? "Yangi yig'ilish tashkil eting." : "Sizni yig'ilishlarga taklif qilishadi."}
      />

      <MeetingDialog open={createOpen || !!editing} onClose={() => { setCreateOpen(false); setEditing(null); }} meeting={editing} />
      <MeetingFilterDialog open={filterOpen} onClose={() => setFilterOpen(false)} value={filters} onApply={setFilters} />
      {detailId && (
        <MeetingDetailDialog
          meetingId={detailId}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          onFinish={(id) => { setDetailId(null); setAttendanceId(id); }}
        />
      )}
      {attendanceId && <AttendanceDialog meetingId={attendanceId} open={!!attendanceId} onClose={() => setAttendanceId(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting.id, { onSuccess: () => { toast.success("O'chirildi"); setDeleting(null); }, onError: (e) => toast.error(apiError(e)) })}
        loading={del.isPending}
        message={`"${deleting?.title}" yig'ilishini o'chirmoqchimisiz?`}
      />
    </div>
  );
}

/** Filter modal: organizer, project, status, start-date range. */
function MeetingFilterDialog({ open, onClose, value, onApply }) {
  const { data: userList } = useUsersList();
  const { data: projectList } = useProjects({ limit: 100 });
  const [f, setF] = useState(value);
  useEffect(() => { if (open) setF(value); }, [open, value]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const clear = () => { const empty = { organizerId: '', projectId: '', status: '', from: '', to: '' }; setF(empty); onApply(empty); onClose(); };
  const apply = () => { onApply(f); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} onBack={onClose} title="Filtrlash" subtitle="Kerakli filtrlarni tanlang, natijalar shunga qarab saralanadi" size="lg"
      footer={<><Button variant="outline" onClick={clear}><X className="h-4 w-4" /> Tozalash</Button><Button onClick={apply}><Search className="h-4 w-4" /> Qidirish</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tashkilotchi">
          <Select value={f.organizerId} onChange={(e) => set('organizerId', e.target.value)}>
            <option value="">Barchasi</option>
            {(userList?.items || []).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Loyiha">
          <Select value={f.projectId} onChange={(e) => set('projectId', e.target.value)}>
            <option value="">Barchasi</option>
            {(projectList?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Holati">
          <Select value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Barchasi</option>
            <option value="planned">Rejada</option>
            <option value="finished">Yakunlangan</option>
          </Select>
        </FormField>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-text-sub">Boshlanish sanasi oralig'i</p>
          <div className="grid grid-cols-2 gap-2">
            <DateTimeBox type="date" placeholder="dan" value={f.from} onChange={(v) => set('from', v)} />
            <DateTimeBox type="date" placeholder="gacha" value={f.to} onChange={(v) => set('to', v)} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function toLocalInput(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function MeetingDialog({ open, onClose, meeting }) {
  const isEdit = !!meeting;
  const { data: projectList } = useProjects({ limit: 100 });
  const { data: userList } = useUsersList();
  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const saving = create.isPending || update.isPending;
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm();
  const [participants, setParticipants] = useState([]);
  const [finished, setFinished] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [created, setCreated] = useState(null); // muvaffaqiyatli yaratilgan yig'ilish (Meet havolasi bilan)

  const users = userList?.items || [];
  const selectedUsers = users.filter((u) => participants.includes(u.id));

  useEffect(() => {
    if (!open) return;
    if (meeting) {
      reset({
        title: meeting.title || '',
        penaltyPercent: meeting.penaltyPercent ?? '',
        projectId: meeting.projectId || '',
        link: meeting.link || '',
        content: meeting.content || '',
        duration: meeting.duration ?? 30,
        startAt: meeting.startAt ? toLocalInput(meeting.startAt) : '',
      });
      setParticipants((meeting.attendance || []).map((a) => a.userId));
      setFinished(!!meeting.finishedAt);
    } else {
      reset({ title: '', penaltyPercent: '', projectId: '', link: '', content: '', duration: 30, startAt: '' });
      setParticipants([]);
      setFinished(false);
    }
    setCreated(null);
  }, [open, meeting, reset]);

  const onSubmit = (v) => {
    if (!v.startAt) { toast.error('Boshlanish vaqtini kiriting'); return; }
    const payload = {
      title: v.title,
      penaltyPercent: v.penaltyPercent === '' ? null : Number(v.penaltyPercent),
      projectId: v.projectId ? Number(v.projectId) : null,
      link: v.link || null,
      content: v.content || null,
      duration: v.duration ? Number(v.duration) : null,
      startAt: v.startAt,
      participantIds: participants,
    };
    if (isEdit) {
      update.mutate({ id: meeting.id, ...payload, finished },
        { onSuccess: () => { toast.success('Saqlandi'); onClose(); }, onError: (e) => toast.error(apiError(e)) });
    } else {
      create.mutate(payload,
        { onSuccess: (m) => { toast.success('Yig\'ilish yaratildi'); setCreated(m); }, onError: (e) => toast.error(apiError(e)) });
    }
  };

  const copyLink = () => { navigator.clipboard?.writeText(created.meetLink); toast.success('Havola nusxalandi'); };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Yig'ilish ma'lumotlari"
      subtitle={isEdit ? "Yig'ilish ma'lumotlarini tahrirlang" : "Yangi yig'ilish yaratish uchun ma'lumotlarni kiriting"}
      size="lg"
      footer={created ? (
        <Button onClick={onClose}>Yopish</Button>
      ) : (
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {isEdit && (<><span className="text-sm font-semibold text-text-strong">Tugatildimi?</span><Switch checked={finished} onChange={() => setFinished((f) => !f)} /></>)}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Yopish</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={saving}>{isEdit ? 'Saqlash' : "Qo'shish"}</Button>
          </div>
        </div>
      )}
    >
      {created ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-strong"><CheckCircle2 className="h-8 w-8" /></span>
          <div>
            <p className="text-lg font-semibold text-text-strong">Yig'ilish yaratildi</p>
            <p className="text-sm text-text-sub">"{created.title}" muvaffaqiyatli qo'shildi</p>
          </div>
          {created.meetLink ? (
            <div className="w-full max-w-md">
              <p className="mb-1.5 text-left text-sm font-medium text-text-sub">Google Meet havolasi</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={created.meetLink} className="flex-1 font-mono text-xs" />
                <Button variant="outline" onClick={copyLink} title="Nusxalash"><Copy className="h-4 w-4" /></Button>
                <a href={created.meetLink} target="_blank" rel="noreferrer"><Button><Video className="h-4 w-4" /> Kirish</Button></a>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-bg-1 px-4 py-2 text-sm text-text-soft">
              Google Meet havolasi yaratilmadi (Google akkaunt sozlanmagan). Yig'ilish saqlandi.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Loyiha">
            <Select {...register('projectId')}>
              <option value="">Umumiy</option>
              {(projectList?.items || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nomi" required error={errors.title && 'Nom kiriting'}>
              <Input placeholder="Yig'ilish nomi" {...register('title', { required: true })} error={errors.title} />
            </FormField>
            <FormField label="Jarima foizi (%)">
              <Input type="number" min="0" max="100" placeholder="0" {...register('penaltyPercent')} />
            </FormField>
            <FormField label="Havolasi" className="sm:col-span-2" hint="Bo'sh qoldirsangiz, tizim avtomatik Google Meet havolasi ochib beradi.">
              <Input placeholder="https://meet.google.com/...  (ixtiyoriy)" {...register('link')} />
            </FormField>
            <FormField label="Tavsifi" className="sm:col-span-2">
              <Textarea placeholder="Tavsifi yozing..." {...register('content')} />
            </FormField>
            <Controller
              name="startAt"
              control={control}
              render={({ field }) => {
                const [d, t] = (field.value || '').split('T');
                const todayISO = () => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
                return (
                  <>
                    <FormField label="Boshlanish sanasi" required>
                      <DateTimeBox type="date" value={d} onChange={(v) => field.onChange(v ? `${v}T${t || '00:00'}` : '')} />
                    </FormField>
                    <FormField label="Boshlanish vaqti">
                      <DateTimeBox type="time" value={t} onChange={(v) => field.onChange(`${d || todayISO()}T${v || '00:00'}`)} />
                    </FormField>
                  </>
                );
              }}
            />
            <FormField label="Davomiyligi (daqiqa)">
              <Input type="number" min="0" {...register('duration')} />
            </FormField>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-sub">Yig'ilish qatnashchilarini qo'shish</p>
            <div className="rounded-lg border border-dashed border-stroke-strong p-4">
              {selectedUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-text-soft">Quyidagi tugma orqali qidiring va tanlang</p>
                  <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Qatnashchilarni qo'shing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-2 rounded-full bg-bg-2 py-1 pl-1 pr-2.5 text-sm">
                        <Avatar name={u.fullName} src={u.avatar} size="sm" />
                        <span className="text-text-strong">{u.fullName}</span>
                        <button type="button" onClick={() => setParticipants((p) => p.filter((x) => x !== u.id))} className="text-icon-soft hover:text-error-strong">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Tahrirlash ({selectedUsers.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      <ParticipantPicker open={pickerOpen} onClose={() => setPickerOpen(false)} users={users} value={participants} onConfirm={setParticipants} />
    </Dialog>
  );
}
