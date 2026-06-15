import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationSocket } from '@/features/notifications/notificationsApi';
import { useMe } from '@/features/auth/authApi';
import { RequireRoute } from '@/app/guards';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const token = useAuthStore((s) => s.accessToken);
  useMe(!!token); // foydalanuvchi profili/roli har sessiyada qayta tekshiriladi (admin rolni o'zgartirsa yangilanadi)
  useNotificationSocket(); // real-time bildirishnomalar

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} onExpand={() => setCollapsed(false)} />
      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <Topbar onMenuClick={() => setMobileOpen(true)} onCollapseToggle={toggleSidebar} />
        {/* Full-width content on every page. */}
        <main className="w-full px-4 py-4 sm:px-6 sm:py-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <RequireRoute>
              <Outlet />
            </RequireRoute>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
