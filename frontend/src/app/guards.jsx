import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { rolesForPath } from '@/components/layout/navConfig';

/** Requires authentication; otherwise redirect to /login. */
export function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/**
 * Aktiv rol joriy sahifaga (navConfig bo'yicha) to'g'ri kelmasa — jim `/`ga yo'naltiradi.
 * Ogohlantirish ko'rsatmaydi. Rol ro'yxati yagona manba (navConfig) bilan boshqariladi,
 * shuning uchun sidebar va route hech qachon bir-biriga zid bo'lmaydi.
 */
export function RequireRoute({ children }) {
  const role = useAuthStore((s) => s.user?.role);
  const { pathname } = useLocation();
  const roles = rolesForPath(pathname);
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
