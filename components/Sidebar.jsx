'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchPendingDoctors } from '@/store/slices/doctorVerificationSlice';
import { fetchPendingPayoutCount } from '@/store/slices/payoutsSlice';
import { logout } from '@/store/slices/authSlice';
import { useSidebar } from '@/components/SidebarContext';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Stethoscope,
  Wallet,
  Building2,
  GraduationCap,
  FileText,
  X,
  Menu,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { open, collapsed, toggleOpen, toggleCollapsed, setOpen } = useSidebar();
  const { user } = useAppSelector((state) => state.auth);
  const { totalElements, loading } = useAppSelector((state) => state.doctorVerification);
  const pendingPayoutCount = useAppSelector((state) => state.payouts?.pendingCount || 0);
  const hasFetchedUnverifiedRef = useRef(false);
  const hasFetchedPayoutsRef = useRef(false);

  useEffect(() => {
    const isOnDoctorActivationPage = pathname === '/doctor-activation';
    if (isOnDoctorActivationPage) return;
    if (totalElements > 0 || loading || hasFetchedUnverifiedRef.current) return;
    hasFetchedUnverifiedRef.current = true;
    dispatch(fetchPendingDoctors({ page: 0, size: 1 }));
  }, [dispatch, pathname, totalElements, loading]);

  useEffect(() => {
    if (pathname?.startsWith('/payment-requests')) return;
    if (hasFetchedPayoutsRef.current) return;
    hasFetchedPayoutsRef.current = true;
    dispatch(fetchPendingPayoutCount());
  }, [dispatch, pathname]);

  // Close mobile drawer after navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setOpen(false);
    }
  }, [pathname, setOpen]);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    {
      href: '/doctor-activation',
      label: 'Unverified',
      icon: UserCheck,
      badge: totalElements > 0 ? totalElements : null,
    },
    { href: '/departments', label: 'Departments', icon: Building2 },
    { href: '/qualifications', label: 'Qualifications', icon: GraduationCap },
    { href: '/content', label: 'Content', icon: FileText },
    { href: '/patients', label: 'Patients', icon: Users },
    { href: '/doctors', label: 'Doctors', icon: Stethoscope },
    {
      href: '/payment-requests',
      label: 'Payment Requests',
      icon: Wallet,
      badge: pendingPayoutCount > 0 ? pendingPayoutCount : null,
    },
  ];

  const adminName = user?.name || user?.email || 'Admin User';
  const adminEmail = user?.email || 'admin@docspot.in';
  const widthClass = collapsed ? 'w-[76px]' : 'w-64';

  return (
    <>
      {/* Mobile hamburger — only when drawer is closed */}
      {!open && (
        <button
          type="button"
          onClick={toggleOpen}
          className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-md hover:bg-primary-50 hover:text-primary-700 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-30
          h-screen
          ${widthClass}
          bg-white/95 backdrop-blur-md
          border-r border-gray-100 soft-shadow-lg
          transition-all duration-300 ease-out
          flex flex-col
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand + controls */}
        <div
          className={`flex items-center border-b border-gray-100 h-16 shrink-0 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <img
                src="/assets/appicon.png"
                alt="Docspot"
                className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
              />
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 leading-tight truncate">
                  Docspot
                </p>
                <p className="text-[11px] text-gray-400 font-medium tracking-wide">
                  Admin
                </p>
              </div>
            </Link>
          )}

          {collapsed && (
            <Link href="/" title="Docspot">
              <img
                src="/assets/appicon.png"
                alt="Docspot"
                className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-gray-100"
              />
            </Link>
          )}

          <div className={`flex items-center gap-1 ${collapsed ? 'hidden' : ''}`}>
            {/* Desktop: collapse to icons */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:inline-flex p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Collapse sidebar"
              title="Collapse to icons"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            {/* Mobile: close drawer */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expand control when icon-rail */}
        {collapsed && (
          <div className="hidden lg:flex justify-center border-b border-gray-100 py-2">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  group relative flex items-center rounded-xl transition-all duration-200
                  ${collapsed ? 'justify-center px-0 py-3' : 'justify-between px-3.5 py-2.5'}
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-md shadow-primary-200/50'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  }
                `}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-3'} min-w-0`}>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                  {!collapsed && (
                    <span className="font-medium text-sm truncate">{item.label}</span>
                  )}
                </div>

                {!collapsed && item.badge != null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {collapsed && item.badge != null && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin + logout */}
        <div className={`border-t border-gray-100 shrink-0 ${collapsed ? 'p-2' : 'p-3'} space-y-2`}>
          {collapsed ? (
            <>
              <div
                className="flex justify-center"
                title={`${adminName}\n${adminEmail}`}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-teal-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="w-full flex items-center justify-center rounded-xl p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-50">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-teal-500 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{adminName}</p>
                  <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
