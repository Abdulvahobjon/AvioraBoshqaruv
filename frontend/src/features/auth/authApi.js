import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { useAuthStore } from '@/store/authStore';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    },
  });
}

export function useMe(enabled = true) {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['me'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/auth/change-password', payload);
      return data;
    },
  });
}
