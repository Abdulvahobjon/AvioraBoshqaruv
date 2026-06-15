import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plane, Sun, Moon, Building2, Briefcase, Database, Globe, User, Shield } from 'lucide-react';
import { useLogin, useSwitchRole } from '@/features/auth/authApi';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { apiError } from '@/lib/api/axios';
import { ROLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/utils/cn';

const schema = z.object({
  fullName: z.string().min(1, 'Login kiriting'),
  password: z.string().min(1, 'Parol kiriting'),
});

const ROLE_ICON = { admin: Building2, manager: Briefcase, accountant: Database, auditor: Globe, employee: User, superadmin: Shield };

export function LoginPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { theme, toggle } = useThemeStore();
  const login = useLogin();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  // Bir nechta rol bo'lsa — tanlash bosqichi (login muvaffaqiyatli, lekin rol tanlanishi shart).
  const [pickRoles, setPickRoles] = useState(null);

  if (token && !pickRoles) return <Navigate to="/" replace />;

  const onSubmit = (values) => {
    login.mutate(values, {
      onSuccess: (data) => {
        if (data.mustSelectRole) {
          setPickRoles(data.roles); // tanlash oynasi
        } else {
          toast.success('Xush kelibsiz!');
          navigate('/');
        }
      },
      onError: (e) => toast.error(apiError(e, 'Kirishda xatolik')),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-1 p-4">
      <button
        onClick={toggle}
        aria-label="Mavzuni almashtirish"
        className="fixed right-4 top-4 rounded-md p-2 text-icon-sub hover:bg-bg-2"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      {pickRoles ? (
        <RoleSelect roles={pickRoles} onDone={() => { toast.success('Xush kelibsiz!'); navigate('/'); }} />
      ) : (
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
              <PasswordInput placeholder="••••••••" error={errors.password} {...register('password')} />
            </FormField>
            <Button type="submit" className="w-full" loading={login.isPending}>
              Kirish
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Bir nechta rolli foydalanuvchi uchun: kirishda aktiv rolni tanlash. */
function RoleSelect({ roles, onDone }) {
  const switchRole = useSwitchRole();
  const [selected, setSelected] = useState(roles[0]);

  const onContinue = () => {
    switchRole.mutate(selected, {
      onSuccess: () => onDone(),
      onError: (e) => toast.error(apiError(e)),
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-stroke-sub bg-bg-base p-7 shadow-card">
      <h1 className="text-2xl font-bold leading-tight text-text-strong">Siz dasturni bir nechta rol bilan foydalanishingiz mumkin</h1>
      <p className="mt-2 text-sm text-text-sub">Quyidagilardan birini tanlang.</p>

      <div className="mt-6 space-y-2.5">
        {roles.map((r) => {
          const Icon = ROLE_ICON[r] || User;
          const active = selected === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-semibold transition-colors',
                active ? 'bg-bg-1 ring-1 ring-stroke-strong text-text-strong' : 'bg-bg-1-alt text-text-sub hover:bg-bg-1',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {ROLE_LABELS[r] || r}
            </button>
          );
        })}
      </div>

      <Button className="mt-6 w-full" onClick={onContinue} loading={switchRole.isPending}>Davom etish</Button>
    </div>
  );
}
