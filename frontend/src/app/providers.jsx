import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useThemeStore } from '@/store/themeStore';

const queryClient = new QueryClient({
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
