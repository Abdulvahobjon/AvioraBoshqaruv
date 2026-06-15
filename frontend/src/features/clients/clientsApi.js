import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';

export function useClients(params) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params });
      return data;
    },
  });
}

export function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/clients/${id}`);
      return data;
    },
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = id
        ? await api.patch(`/clients/${id}`, payload)
        : await api.post('/clients', payload);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      if (vars?.id) qc.invalidateQueries({ queryKey: ['client', String(vars.id)] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/clients/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

/** Sub-resurs (to'lov/kontakt/faoliyat/hujjat) mutatsiyalari — bitta mijoz kartasini yangilaydi. */
function useClientSubMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client', String(vars.clientId)] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

// ── To'lovlar ──
export function useAddClientPayment() {
  return useClientSubMutation(async ({ clientId, ...body }) => (await api.post(`/clients/${clientId}/payments`, body)).data);
}
export function useDeleteClientPayment() {
  return useClientSubMutation(async ({ clientId, paymentId }) => (await api.delete(`/clients/${clientId}/payments/${paymentId}`)).data);
}

// ── Kontakt shaxslar ──
export function useSaveClientContact() {
  return useClientSubMutation(async ({ clientId, contactId, ...body }) =>
    (contactId
      ? await api.patch(`/clients/${clientId}/contacts/${contactId}`, body)
      : await api.post(`/clients/${clientId}/contacts`, body)).data);
}
export function useDeleteClientContact() {
  return useClientSubMutation(async ({ clientId, contactId }) => (await api.delete(`/clients/${clientId}/contacts/${contactId}`)).data);
}

// ── Faoliyat / muloqot tarixi ──
export function useAddClientActivity() {
  return useClientSubMutation(async ({ clientId, ...body }) => (await api.post(`/clients/${clientId}/activities`, body)).data);
}
export function useDeleteClientActivity() {
  return useClientSubMutation(async ({ clientId, activityId }) => (await api.delete(`/clients/${clientId}/activities/${activityId}`)).data);
}

// ── Hujjatlar ──
export function useAddClientDocument() {
  return useClientSubMutation(async ({ clientId, ...body }) => (await api.post(`/clients/${clientId}/documents`, body)).data);
}
export function useDeleteClientDocument() {
  return useClientSubMutation(async ({ clientId, docId }) => (await api.delete(`/clients/${clientId}/documents/${docId}`)).data);
}

/** Mijoz hujjati uchun fayl yuklash (URL qaytaradi). */
export function useUploadClientFile() {
  return useMutation({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/clients/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    },
  });
}
