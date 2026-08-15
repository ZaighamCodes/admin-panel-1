'use client';

import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorHandler from '@/components/ErrorHandler';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

function DashboardShell({ children }) {
  const { open } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex relative min-h-screen">
        <Sidebar />
        <main
          className={`
            flex-1 min-w-0 min-h-screen
            p-4 sm:p-6
            transition-all duration-300
            ${!open ? 'pt-16 lg:pt-6' : ''}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <ErrorBoundary resetKey={pathname}>
      <ErrorHandler>
        <ProtectedRoute>
          <SidebarProvider>
            <DashboardShell>{children}</DashboardShell>
          </SidebarProvider>
        </ProtectedRoute>
      </ErrorHandler>
    </ErrorBoundary>
  );
}
