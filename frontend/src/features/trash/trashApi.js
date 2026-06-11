import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useTrashProjects() {
  return useQuery({ queryKey: ['trash', 'projects'], queryFn: async () => (await api.get('/projects/trash')).data });
}
export function useTrashTasks() {
  return useQuery({ queryKey: ['trash', 'tasks'], queryFn: async () => (await api.get('/tasks/trash')).data });
}

export function useRestoreProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/projects/${id}/restore`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash', 'projects'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRestoreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/tasks/${id}/restore`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash', 'tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}
