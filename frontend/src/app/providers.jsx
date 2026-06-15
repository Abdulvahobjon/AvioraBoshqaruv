import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useThemeStore } from '@/store/themeStore';
import { apiError } from '@/lib/api/axios';

const queryClient = new QueryClient({
  // Query xatolari endi "jim" ketmaydi — global toast ko'rsatamiz (har bir sahifada
  // alohida isError yozish o'rniga). 401 — axios interceptor refresh bilan hal qiladi, o'tkazib yuboramiz.
  // 403 — rol bu bo'limga ruxsatsiz; route guard allaqachon yo'naltiradi, ortiqcha "ruxsat yo'q" toast kerak emas.
  queryCache: new QueryCache({
    onError: (error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) return;
      toast.error(apiError(error, 'Ma\'lumotni yuklab bo\'lmadi'));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function Providers({ children }) {
  const theme = useThemeStore((s) => s.theme);
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: { colorPrimary: '#3F57B3', borderRadius: 10, fontFamily: 'Inter, system-ui, sans-serif' },
        }}
      >
        {children}
        <Toaster richColors position="top-right" theme={theme} />
      </ConfigProvider>
    </QueryClientProvider>
  );
}
