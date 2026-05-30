import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plane, Sun, Moon } from 'lucide-react';
import { useLogin } from '@/features/auth/authApi';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { apiError } from '@/lib/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

const schema = z.object({
  fullName: z.string().min(1, 'Login kiriting'),
  password: z.string().min(1, 'Parol kiriting'),
});

export function LoginPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { theme, toggle } = useThemeStore();
  const login = useLogin();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  if (token) return <Navigate to="/" replace />;

  const onSubmit = (values) => {
    login.mutate(values, {
      onSuccess: () => { toast.success('Xush kelibsiz!'); navigate('/'); },
      onError: (e) => toast.error(apiError(e, 'Kirishda xatolik')),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-elevation-1 p-4">
      <button
        onClick={toggle}
        className="fixed right-4 top-4 rounded-md p-2 text-icon-sub hover:bg-bg-2"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-strong">
            <Plane className="h-7 w-7 text-text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-strong">Aviora Boshqaruv</h1>
          <p className="mt-1 text-sm text-text-sub">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-stroke-sub bg-bg-base p-6 shadow-card"
        >
          <FormField label="Login (Ism Familiya)" error={errors.fullName?.message} required>
            <Input placeholder="Asadbek Superadmin" error={errors.fullName} {...register('fullName')} />
          </FormField>
          <FormField label="Parol" error={errors.password?.message} required>
            <Input type="password" placeholder="••••••••" error={errors.password} {...register('password')} />
          </FormField>
          <Button type="submit" className="w-full" loading={login.isPending}>
            Kirish
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-soft">
          Test: <span className="font-medium text-text-sub">Asadbek Superadmin</span> / Aviora2026!
        </p>
      </div>
    </div>
  );
}
