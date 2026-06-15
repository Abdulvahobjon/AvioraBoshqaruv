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
      // refreshToken endi httpOnly cookie'da — store'da saqlanmaydi.
      // user.role = default aktiv rol; bir nechta rol bo'lsa LoginPage tanlash oynasini ko'rsatadi.
      setAuth({ accessToken: data.accessToken, user: data.user });
    },
  });
}

/** Aktiv rolni almashtirish — yangi token qayta beriladi (qayta login shart emas). */
export function useSwitchRole() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (role) => {
      const { data } = await api.post('/auth/switch-role', { role });
      return data;
    },
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user });
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

/** O'z profilini tahrirlash (shaxsiy maydonlar) — store'dagi user yangilanadi. */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.patch('/auth/profile', payload);
      return data;
    },
    onSuccess: (data) => setUser(data),
  });
}

/** O'z profili uchun fayl (avatar/passport) yuklash → { url } qaytaradi. */
export function useUploadOwnFile() {
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/auth/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data; // { url, name, size }
    },
  });
}
