'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAdminDoctors,
  setAdminDoctorFilters,
  setAdminDoctorPage,
  setAdminDoctorSearch,
} from '@/store/slices/adminDoctorsSlice';
import { resolveSafeFileUrl } from '@/services/patientsApi';
import Table from '@/components/Table';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Stethoscope,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'D';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatInr = (amount) =>
  `₹${Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const statusStyles = {
  ONLINE: 'bg-emerald-100 text-emerald-800',
  BUSY: 'bg-amber-100 text-amber-800',
  OFFLINE: 'bg-gray-100 text-gray-700',
};

export default function DoctorsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    items = [],
    page = 0,
    size = 20,
    totalElements = 0,
    totalPages = 0,
    q = '',
    verified = 'all',
    isActive = 'all',
    loading = false,
    error = null,
  } = useAppSelector((state) => state.adminDoctors || {});

  const [searchInput, setSearchInput] = useState(q || '');
  const lastErrorRef = useRef(null);
  const debounceRef = useRef(null);
  const mountedRef = useRef(false);

  const load = (overrides = {}) => {
    dispatch(
      fetchAdminDoctors({
        page: overrides.page ?? page,
        size: overrides.size ?? size,
        q: overrides.q ?? q,
        verified: overrides.verified ?? verified,
        isActive: overrides.isActive ?? isActive,
      })
    );
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    load({ page: 0, size: 20, q: '', verified: 'all', isActive: 'all' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next === (q || '')) return;
      dispatch(setAdminDoctorSearch(next));
      load({ page: 0, q: next });
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleFilterChange = (key, value) => {
    // value comes as string from select: 'all' | 'true' | 'false'
    let parsed = 'all';
    if (value === 'true') parsed = true;
    if (value === 'false') parsed = false;
    dispatch(setAdminDoctorFilters({ [key]: parsed }));
    load({ page: 0, [key]: parsed });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || (totalPages > 0 && newPage >= totalPages)) return;
    dispatch(setAdminDoctorPage(newPage));
    load({ page: newPage });
  };

  const openDoctor = (doctor) => {
    const id = doctor?.doctorId;
    if (!id) {
      toast.error('Missing doctor ID');
      return;
    }
    router.push(`/doctors/${id}`);
  };

  const columns = [
    {
      header: 'Doctor',
      accessor: (row) => {
        const photo = resolveSafeFileUrl(row.profilePicture);
        return (
          <div className="flex items-center gap-3 min-w-[220px]">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
                {initials(row.name)}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{row.name || '—'}</p>
              <p className="text-xs text-gray-500">{row.email || row.mobileNumber || '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Department',
      accessor: (row) => row.department || '—',
    },
    {
      header: 'Status',
      accessor: (row) => {
        const status = String(row.status || 'OFFLINE').toUpperCase();
        return (
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
              statusStyles[status] || statusStyles.OFFLINE
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      header: 'Fee',
      accessor: (row) => formatInr(row.effectiveConsultationFeeInr ?? 99),
    },
    {
      header: 'Active',
      accessor: (row) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Verified',
      accessor: (row) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.isVerified ? 'bg-sky-100 text-sky-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.isVerified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <Stethoscope className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Directory</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Doctors</h1>
          <p className="text-gray-600 mt-2">
            Search, filter, and open a doctor for stats, fee, and activate/deactivate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            {totalElements} total
          </span>
          <button
            type="button"
            onClick={() => {
              load();
              toast.success('Doctors refreshed');
            }}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:bg-white rounded-xl border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            autoComplete="off"
            placeholder="Search name, email, mobile, or registration..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300"
          />
        </div>
        <select
          value={isActive === 'all' ? 'all' : String(isActive)}
          onChange={(e) => handleFilterChange('isActive', e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[140px]"
        >
          <option value="all">All activity</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={verified === 'all' ? 'all' : String(verified)}
          onChange={(e) => handleFilterChange('verified', e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[150px]"
        >
          <option value="all">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading doctors...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <User className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No doctors found</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting search or filters.</p>
        </div>
      ) : (
        <Table columns={columns} data={items} onRowClick={openDoctor} />
      )}

      {(totalPages > 1 || page > 0) && (
        <div className="flex items-center justify-between bg-white rounded-xl soft-shadow-lg px-4 py-3 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {totalElements === 0 ? 0 : page * size + 1}–
            {Math.min((page + 1) * size, totalElements)} of {totalElements}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0 || loading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-700">
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={loading || (totalPages > 0 ? page >= totalPages - 1 : !items.length)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
