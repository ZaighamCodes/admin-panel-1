'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchPendingDoctors } from '@/store/slices/doctorVerificationSlice';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Stethoscope,
  CreditCard,
  Bell,
  Building2,
  GraduationCap,
  FileText,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { totalElements, loading } = useAppSelector((state) => state.doctorVerification);
  const hasFetchedRef = useRef(false);

  // Only fetch pending count if:
  // 1. We're NOT on the doctor-activation page (that page will fetch it)
  // 2. We don't already have the count (totalElements > 0 means we have data)
  // 3. We're not currently loading
  // 4. We haven't already fetched in this session
  useEffect(() => {
    const isOnDoctorActivationPage = pathname === '/doctor-activation';
    
    // If we're on the doctor-activation page, don't fetch (that page handles it)
    if (isOnDoctorActivationPage) {
      return;
    }
    
    // If we already have the count, are loading, or have fetched, don't fetch again
    if (totalElements > 0 || loading || hasFetchedRef.current) {
      return;
    }
    
    // Only fetch count once per session if we don't have it yet
    hasFetchedRef.current = true;
    dispatch(fetchPendingDoctors({ page: 0, size: 1 })); // Just to get the count
  }, [dispatch, pathname, totalElements, loading]);

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
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-white soft-shadow-lg border-r border-gray-100 h-screen sticky top-0">
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-md'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

