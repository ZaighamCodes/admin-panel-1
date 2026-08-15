'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAdminPatients, setPatientPage, setPatientSearch } from '@/store/slices/patientsSlice';
import { encodePatientId, resolveSafeFileUrl } from '@/services/patientsApi';
import Table from '@/components/Table';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  User,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'P';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatDob = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

export default function PatientsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    items = [],
    page,
    size,
    totalElements,
    totalPages,
    q,
    loading,
    error,
  } = useAppSelector((state) => state.patients || {});

  const [searchInput, setSearchInput] = useState(q || '');
  const lastErrorRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAdminPatients({ page: 0, size: 20, q: '' }));
  }, [dispatch]);

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
      dispatch(setPatientSearch(next));
      dispatch(fetchAdminPatients({ page: 0, size: 20, q: next }));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, dispatch, q]);

  const handlePageChange = (newPage) => {
    if (newPage < 0 || (totalPages > 0 && newPage >= totalPages)) return;
    dispatch(setPatientPage(newPage));
    dispatch(fetchAdminPatients({ page: newPage, size: 20, q }));
  };

  const handleRefresh = () => {
    dispatch(fetchAdminPatients({ page, size: 20, q, }));
    toast.success('Patients refreshed');
  };

  const openPatient = (patient) => {
    const id = patient?.patientId;
    if (!id) {
      toast.error('Missing patient ID');
      return;
    }
    router.push(`/patients/${encodePatientId(id)}`);
  };

  const columns = [
    {
      header: 'Patient',
      accessor: (row) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          {row.profilePictureUrl && resolveSafeFileUrl(row.profilePictureUrl) ? (
            <img
              src={resolveSafeFileUrl(row.profilePictureUrl)}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
              {initials(row.patientName)}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{row.patientName || '—'}</p>
            <p className="text-xs font-mono text-gray-500">{row.patientId}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Gender · Age',
      accessor: (row) => (
        <span className="text-sm text-gray-700">
          {row.gender || '—'}
          {row.age != null ? ` · ${row.age} yrs` : ''}
        </span>
      ),
    },
    {
      header: 'Date of birth',
      accessor: (row) => formatDob(row.dateOfBirth),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <button
          type="button"
          onClick={() => openPatient(row)}
          className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Directory</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Patients</h1>
          <p className="text-gray-600 mt-2">Search by name or mobile. Open a row for documents and prescriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            {totalElements} total
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:bg-white rounded-xl border border-gray-200"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="search"
          autoComplete="off"
          placeholder="Search name or mobile..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300 shadow-sm"
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading patients...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <User className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No patients found</p>
          <p className="text-sm text-gray-500 mt-2">Try a different search, or wait until patients register.</p>
        </div>
      ) : (
        <Table columns={columns} data={items} />
      )}

      {(totalPages > 1 || page > 0) && (
        <div className="flex items-center justify-between bg-white rounded-xl soft-shadow-lg px-4 py-3 border border-gray-100">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0 || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page + 1 >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
