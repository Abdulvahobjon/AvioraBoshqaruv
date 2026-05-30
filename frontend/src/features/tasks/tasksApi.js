import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useBoard(projectId) {
  return useQuery({
    queryKey: ['board', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await api.get('/tasks/board', { params: { projectId } });
      return data;
    },
  });
}

export function useTask(id) {
  return useQuery({
    queryKey: ['task', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data;
    },
  });
}

export function useSaveTask(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id ? await api.patch(`/tasks/${id}`, payload) : await api.post('/tasks', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', projectId] }),
  });
}

export function useChangeStatus(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, orderIndex }) => {
      const { data } = await api.patch(`/tasks/${id}/status`, { status, orderIndex });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', projectId] }),
  });
}

export function useReviewTask(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verdict, comment }) => {
      const { data } = await api.post(`/tasks/${id}/review`, { verdict, comment });
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      qc.invalidateQueries({ queryKey: ['task', String(vars.id)] });
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
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['task', String(vars.id)] }),
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
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['task', String(vars.id)] }),
  });
}

export function useDeleteTask(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/tasks/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board', projectId] }),
  });
}
