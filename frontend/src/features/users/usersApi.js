import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Lightweight user list for member/manager pickers. */
export function useUsersList(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 100, ...params } });
      return data;
    },
  });
}

/** Full user record (for the detail/edit page). */
export function useUser(id) {
  return useQuery({
    queryKey: ['user', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/users/${id}`)).data,
  });
}

/** Upload an avatar / passport file → returns { url, name, size }. */
export function useUploadUserFile() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/users/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    },
  });
}

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) =>
      (id ? await api.patch(`/users/${id}`, payload) : await api.post('/users', payload)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      if (vars.id) qc.invalidateQueries({ queryKey: ['user', String(vars.id)] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
