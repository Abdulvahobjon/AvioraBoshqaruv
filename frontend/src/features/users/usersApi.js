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

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) =>
      (id ? await api.patch(`/users/${id}`, payload) : await api.post('/users', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
