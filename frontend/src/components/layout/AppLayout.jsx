import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useNotificationSocket } from '@/features/notifications/notificationsApi';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useNotificationSocket(); // real-time bildirishnomalar

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} onExpand={() => setCollapsed(false)} />
      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <Topbar onMenuClick={() => setMobileOpen(true)} onCollapseToggle={() => setCollapsed((c) => !c)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
