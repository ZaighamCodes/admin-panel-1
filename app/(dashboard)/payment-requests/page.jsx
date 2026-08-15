'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPendingPayouts } from '@/store/slices/payoutsSlice';
import Table from '@/components/Table';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
  Eye,
  Building2,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatInr = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const maskedDestination = (method) => {
  if (!method) return '—';
  if (method.type === 'UPI') return method.upiHandleMasked || '—';
  return method.accountMasked || (method.accountLast4 ? `****${method.accountLast4}` : '—');
};

export default function PaymentRequestsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    items = [],
    page,
    size,
    totalElements,
    totalPages,
    hasNext,
    hasPrevious,
    loading,
    error,
  } = useAppSelector((state) => state.payouts?.pending || {});

  const lastErrorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchPendingPayouts({ page: 0, size: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const handlePageChange = (newPage) => {
    if (newPage < 0) return;
    dispatch(fetchPendingPayouts({ page: newPage, size }));
  };

  const handleRefresh = () => {
    dispatch(fetchPendingPayouts({ page, size }));
    toast.success('Payment requests refreshed');
  };

  const columns = [
    {
      header: 'Request ID',
      accessor: (row) => (
        <span className="font-mono text-sm font-semibold text-gray-800">#{row.id}</span>
      ),
    },
    {
      header: 'Doctor',
      accessor: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.doctorName || '—'}</p>
          <p className="text-xs text-gray-500">ID {row.doctorId}</p>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: (row) => (
        <span className="font-bold text-primary-700">{formatInr(row.amountInr)}</span>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => {
        const type = row.payoutMethodMasked?.type || '—';
        const isUpi = type === 'UPI';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isUpi
                ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
                : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
            }`}
          >
            {isUpi ? <Smartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            {type}
          </span>
        );
      },
    },
    {
      header: 'Account / UPI',
      accessor: (row) => (
        <div className="text-sm">
          <p className="font-mono text-gray-800">{maskedDestination(row.payoutMethodMasked)}</p>
          {row.payoutMethodMasked?.type === 'BANK' && row.payoutMethodMasked?.bankName && (
            <p className="text-xs text-gray-500 mt-0.5">{row.payoutMethodMasked.bankName}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Requested at',
      accessor: (row) => (
        <span className="text-sm text-gray-600">{formatDateTime(row.requestedAt)}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <button
          type="button"
          onClick={() => router.push(`/payment-requests/${row.id}?doctorId=${row.doctorId}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Payouts</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Requests</h1>
          <p className="text-gray-600 mt-2 max-w-xl">
            Pending doctor withdrawals. Pay manually via bank / UPI, then mark paid with UTR.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            {totalElements} pending
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:bg-white rounded-xl border border-gray-200 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment requests...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Wallet className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">No pending requests</p>
          <p className="text-sm text-gray-500 mt-2">
            When doctors request withdrawals, they will appear here.
          </p>
        </div>
      ) : (
        <Table columns={columns} data={items} />
      )}

      {(totalPages > 1 || hasNext || hasPrevious) && (
        <div className="flex items-center justify-between bg-white rounded-xl soft-shadow-lg px-4 py-3 border border-gray-100">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={!hasPrevious || page === 0 || loading}
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
            disabled={!hasNext || loading}
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
