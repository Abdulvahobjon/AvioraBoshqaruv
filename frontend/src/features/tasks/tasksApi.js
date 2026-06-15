import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useBoard(filters = {}) {
  return useQuery({
    queryKey: ['board', filters],
    queryFn: async () => {
      const { data } = await api.get('/tasks/board', { params: filters });
      return data;
    },
  });
}

export function useTasks(filters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await api.get('/tasks', { params: filters });
      return data;
    },
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: ['task', Number(id)],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data;
    },
  });
}

function invalidateLists(qc) {
  qc.invalidateQueries({ queryKey: ['board'] });
  qc.invalidateQueries({ queryKey: ['tasks'] });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id ? await api.patch(`/tasks/${id}`, payload) : await api.post('/tasks', payload);
      return data;
    },
    onSuccess: () => invalidateLists(qc),
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, orderIndex }) => {
      const { data } = await api.patch(`/tasks/${id}/status`, { status, orderIndex });
      return data;
    },
    // Optimistic: move the card to the new column instantly (Trello-like), roll back on error.
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['board'] });
      const prev = qc.getQueriesData({ queryKey: ['board'] });
      qc.setQueriesData({ queryKey: ['board'] }, (old) =>
        Array.isArray(old) ? old.map((t) => (t.id === id ? { ...t, status } : t)) : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidateLists(qc),
  });
}

export function useReviewTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verdict, comment, photoUrl }) => {
      const { data } = await api.post(`/tasks/${id}/review`, { verdict, comment, photoUrl });
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidateLists(qc);
      qc.invalidateQueries({ queryKey: ['task', Number(vars.id)] });
    },
  });
}

/** Rasm yuklab, URL qaytaradi (rad etish dalili uchun). TaskFile yaratmaydi. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/tasks/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const { data } = await api.post(`/tasks/${id}/comments`, { body });
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['task', Number(vars.id)] }),
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/tasks/${id}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['task', Number(vars.id)] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/tasks/${id}`);
      return data;
    },
    onSuccess: () => invalidateLists(qc),
  });
}
