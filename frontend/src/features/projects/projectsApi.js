import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useProjects(params) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params });
      return data;
    },
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data;
    },
  });
}

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id
        ? await api.patch(`/projects/${id}`, payload)
        : await api.post('/projects', payload);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (vars.id) qc.invalidateQueries({ queryKey: ['project', String(vars.id)] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/projects/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
