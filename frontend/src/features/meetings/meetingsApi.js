import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useMeetings() {
  return useQuery({ queryKey: ['meetings'], queryFn: async () => (await api.get('/meetings')).data });
}

export function useMeeting(id) {
  return useQuery({
    queryKey: ['meeting', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/meetings/${id}`)).data,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post('/meetings', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}

export function useFinishMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, attendedUserIds }) => (await api.post(`/meetings/${id}/finish`, { attendedUserIds })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['meeting', String(v.id)] });
    },
  });
}

export function useSubmitReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await api.post(`/meetings/${id}/reason`, { reason })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      qc.invalidateQueries({ queryKey: ['meeting', String(v.id)] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/meetings/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}
