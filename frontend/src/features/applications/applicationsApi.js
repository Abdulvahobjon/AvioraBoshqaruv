import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

/** Arizalar ro'yxati (admin/manager/superadmin). */
export function useApplications(params = {}) {
  return useQuery({
    queryKey: ['applications', params],
    queryFn: async () => (await api.get('/applications', { params })).data,
  });
}

export function useApplication(id) {
  return useQuery({
    queryKey: ['application', id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/applications/${id}`)).data,
  });
}

/** Arizani ko'rib chiqish: status + xulosa. */
export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, conclusion }) =>
      (await api.patch(`/applications/${id}/review`, { status, conclusion })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/applications/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
}

// ── Public (anketa formasi) ──

/** Public: anketa uchun ma'lumotnomalar (regions/districts/positions). */
export function useApplicationMeta() {
  return useQuery({
    queryKey: ['applicationMeta'],
    staleTime: 10 * 60_000,
    queryFn: async () => (await api.get('/applications/meta')).data,
  });
}

/** Public: ariza yuborish (multipart — rezyume PDF). */
export function useSubmitApplication() {
  return useMutation({
    mutationFn: async (formData) =>
      (await api.post('/applications', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
  });
}
