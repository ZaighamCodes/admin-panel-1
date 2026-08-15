'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAdminDoctorProfile,
  fetchAdminAttendedPatients,
  fetchAdminDoctorProfile,
  setAdminDoctorActive,
  updateAdminDoctorPricing,
} from '@/store/slices/adminDoctorsSlice';
import { formatTalkTime } from '@/services/doctorsApi';
import { resolveSafeFileUrl } from '@/services/patientsApi';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import {
  ArrowLeft,
  IndianRupee,
  Phone,
  RefreshCw,
  User,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
  `₹${Number(amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const statusStyles = {
  ONLINE: 'bg-emerald-100 text-emerald-800',
  BUSY: 'bg-amber-100 text-amber-800',
  OFFLINE: 'bg-gray-100 text-gray-700',
};

export default function DoctorProfilePage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const doctorId = Number(params?.doctorId);

  const {
    profile,
    actionLoading = false,
  } = useAppSelector((state) => state.adminDoctors || {});

  const data = profile?.doctorId === doctorId ? profile.data : null;
  const loading = profile?.loading && profile?.doctorId === doctorId && !data;
  const error = profile?.doctorId === doctorId ? profile.error : null;
  const patientsLoading = profile?.patientsLoading;

  const doctor = data?.doctor;
  const pricing = data?.pricing;
  const wallet = data?.wallet;
  const calling = data?.calling;
  const attended = data?.attendedPatients || {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  };
  const prescriptionsAvailable = Boolean(data?.prescriptionsAvailable);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [earningInput, setEarningInput] = useState('');
  const [clearFee, setClearFee] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(doctorId) || doctorId <= 0) return undefined;
    dispatch(fetchAdminDoctorProfile({ doctorId, patientsPage: 0, patientsSize: 20 }));
    return () => {
      dispatch(clearAdminDoctorProfile());
    };
  }, [dispatch, doctorId]);

  const lastErrorRef = useRef(null);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const photo = useMemo(
    () => resolveSafeFileUrl(doctor?.profilePicture),
    [doctor?.profilePicture]
  );

  const walletEnabled = wallet?.walletEnabled !== false;
  const callingAvailable = calling?.available !== false;

  const stats = [
    {
      label: 'Completed calls',
      value: callingAvailable ? calling?.completedCalls ?? 0 : '—',
      icon: CheckCircle2,
    },
    {
      label: 'Total calls',
      value: callingAvailable ? calling?.totalCalls ?? 0 : '—',
      icon: Phone,
    },
    {
      label: 'Unique patients',
      value: callingAvailable ? calling?.uniquePatients ?? 0 : '—',
      icon: Users,
    },
    {
      label: 'Talk time',
      value: callingAvailable
        ? formatTalkTime(calling?.totalTalkTimeSeconds ?? 0)
        : '—',
      icon: Clock,
    },
    {
      label: 'Lifetime earnings',
      value: walletEnabled ? formatInr(wallet?.lifetimeEarningsInr ?? 0) : 'Wallet off',
      icon: IndianRupee,
    },
    {
      label: 'Available balance',
      value: walletEnabled ? formatInr(wallet?.availableBalanceInr ?? 0) : formatInr(0),
      icon: Wallet,
    },
    {
      label: 'Consultation fee',
      value: formatInr(
        pricing?.effectiveConsultationFeeInr ??
          doctor?.effectiveConsultationFeeInr ??
          99
      ),
      icon: IndianRupee,
    },
  ];

  const patientColumns = [
    {
      header: 'Patient',
      accessor: (row) => {
        const img = resolveSafeFileUrl(row.patientImageUrl);
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            {img ? (
              <img
                src={img}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                {initials(row.patientName)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{row.patientName || '—'}</p>
              <p className="text-xs font-mono text-gray-500">{row.patientId}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Calls',
      accessor: (row) => `${row.completedCalls ?? 0}/${row.totalCallsWithDoctor ?? 0}`,
    },
    {
      header: 'Last call',
      accessor: (row) => (
        <div>
          <p className="text-sm text-gray-900">{formatDateTime(row.lastCallAt)}</p>
          <p className="text-xs text-gray-500">
            {row.lastCallStatus || '—'}
            {row.lastCallType ? ` · ${row.lastCallType}` : ''}
            {row.lastCallDurationSeconds != null
              ? ` · ${formatTalkTime(row.lastCallDurationSeconds)}`
              : ''}
          </p>
        </div>
      ),
    },
  ];

  const handlePatientsPage = (newPage) => {
    if (newPage < 0 || (attended.totalPages > 0 && newPage >= attended.totalPages)) return;
    dispatch(
      fetchAdminAttendedPatients({
        doctorId,
        page: newPage,
        size: attended.size || 20,
      })
    );
  };

  const openFeeModal = () => {
    setFeeInput(
      String(
        pricing?.effectiveConsultationFeeInr ??
          doctor?.effectiveConsultationFeeInr ??
          99
      )
    );
    setEarningInput(
      pricing?.earningInrOverride != null
        ? String(pricing.earningInrOverride)
        : pricing?.effectiveEarningInr != null
          ? String(pricing.effectiveEarningInr)
          : ''
    );
    setClearFee(false);
    setFeeOpen(true);
  };

  const handleSaveFee = async () => {
    if (clearFee) {
      const result = await dispatch(
        updateAdminDoctorPricing({
          doctorId,
          body: { clearConsultationFee: true },
        })
      );
      if (updateAdminDoctorPricing.fulfilled.match(result)) {
        toast.success('Fee reset to platform default');
        setFeeOpen(false);
        dispatch(fetchAdminDoctorProfile({ doctorId, patientsPage: attended.page || 0 }));
      } else {
        toast.error(result.payload || 'Failed to update fee');
      }
      return;
    }

    const fee = Number(feeInput);
    if (!Number.isFinite(fee) || fee < 1) {
      toast.error('Fee must be at least ₹1');
      return;
    }

    const body = { consultationFeeInr: fee };
    if (String(earningInput).trim() !== '') {
      const earning = Number(earningInput);
      if (!Number.isFinite(earning) || earning < 0) {
        toast.error('Enter a valid earning amount');
        return;
      }
      if (earning > fee) {
        toast.error('Earning cannot exceed consultation fee');
        return;
      }
      body.earningInr = earning;
    }

    const result = await dispatch(updateAdminDoctorPricing({ doctorId, body }));
    if (updateAdminDoctorPricing.fulfilled.match(result)) {
      toast.success('Consultation fee updated');
      setFeeOpen(false);
      dispatch(fetchAdminDoctorProfile({ doctorId, patientsPage: attended.page || 0 }));
    } else {
      toast.error(result.payload || 'Failed to update fee');
    }
  };

  const handleToggleActive = async () => {
    if (doctor?.isActive) {
      setDeactivateReason('');
      setDeactivateOpen(true);
      return;
    }
    const result = await dispatch(
      setAdminDoctorActive({ doctorId, isActive: true })
    );
    if (setAdminDoctorActive.fulfilled.match(result)) {
      toast.success('Doctor activated');
    } else {
      toast.error(result.payload || 'Failed to activate');
    }
  };

  const confirmDeactivate = async () => {
    const reason = deactivateReason.trim().slice(0, 500);
    if (!reason) {
      toast.error('Please provide a reason for deactivation');
      return;
    }
    const result = await dispatch(
      setAdminDoctorActive({ doctorId, isActive: false, reason })
    );
    if (setAdminDoctorActive.fulfilled.match(result)) {
      toast.success('Doctor deactivated');
      setDeactivateOpen(false);
      setDeactivateReason('');
    } else {
      toast.error(result.payload || 'Failed to deactivate');
    }
  };

  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return (
      <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
        <p className="text-gray-800 font-semibold">Invalid doctor ID</p>
        <Link href="/doctors" className="text-primary-600 text-sm mt-3 inline-block">
          Back to doctors
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading doctor profile...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-white rounded-xl p-10 text-center border border-gray-100 space-y-3">
        <p className="text-gray-800 font-semibold">{error || 'Doctor not found'}</p>
        <div className="flex justify-center gap-3">
          <Link href="/doctors" className="text-primary-600 text-sm">
            Back to doctors
          </Link>
          <button
            type="button"
            onClick={() =>
              dispatch(fetchAdminDoctorProfile({ doctorId, patientsPage: 0 }))
            }
            className="text-sm text-gray-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const status = String(doctor.status || 'OFFLINE').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/doctors"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to doctors
        </Link>
        <button
          type="button"
          onClick={() =>
            dispatch(
              fetchAdminDoctorProfile({
                doctorId,
                patientsPage: attended.page || 0,
                patientsSize: attended.size || 20,
              })
            )
          }
          className="p-2 text-gray-600 hover:bg-white rounded-xl border border-gray-200"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div className="flex items-start gap-4 min-w-0">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                {initials(doctor.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{doctor.name}</h1>
              <p className="text-gray-600 mt-1">
                {doctor.department || '—'}
                {doctor.qualification ? ` · ${doctor.qualification}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                    statusStyles[status] || statusStyles.OFFLINE
                  }`}
                >
                  {status}
                </span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                    doctor.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {doctor.isActive ? 'Active' : 'Inactive'}
                </span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                    doctor.isVerified
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {doctor.isVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {doctor.email} · {doctor.mobileNumber} · Reg {doctor.registrationNumber || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={openFeeModal}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Edit fee
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={actionLoading}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white ${
                doctor.isActive
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:opacity-60`}
            >
              {doctor.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {!callingAvailable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">Call stats temporarily unavailable</p>
        </div>
      )}

      {!walletEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
          <Wallet className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">Wallet not enabled — balances shown as ₹0</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Attended patients */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Attended patients</h2>
            <p className="text-sm text-gray-500 mt-1">
              {attended.totalElements ?? 0} unique patients with call history
            </p>
          </div>
          {patientsLoading && (
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {(attended.content || []).length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <User className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            No attended patients yet
          </div>
        ) : (
          <Table columns={patientColumns} data={attended.content || []} />
        )}

        {(attended.totalPages > 1 || attended.page > 0) && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-600">
              Page {(attended.page ?? 0) + 1} of {Math.max(attended.totalPages || 1, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={patientsLoading || !attended.page}
                onClick={() => handlePatientsPage((attended.page || 0) - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  patientsLoading ||
                  (attended.totalPages > 0
                    ? attended.page >= attended.totalPages - 1
                    : true)
                }
                onClick={() => handlePatientsPage((attended.page || 0) + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prescriptions placeholder */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Prescriptions</h2>
        {!prescriptionsAvailable ? (
          <p className="text-sm text-gray-500 mt-2">Prescriptions coming soon</p>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No prescription documents in this view.</p>
        )}
      </div>

      {/* Deactivate modal */}
      <Modal
        isOpen={deactivateOpen}
        onClose={() => !actionLoading && setDeactivateOpen(false)}
        title="Deactivate doctor"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {doctor.name} will stay in the admin list but disappear from the patient app.
            Provide a reason (required, max 500 characters).
          </p>
          <textarea
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="e.g. Multiple patient complaints"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/30"
          />
          <p className="text-xs text-gray-400 text-right">{deactivateReason.length}/500</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setDeactivateOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={confirmDeactivate}
              className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-60"
            >
              {actionLoading ? 'Saving...' : 'Confirm deactivate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Fee modal */}
      <Modal
        isOpen={feeOpen}
        onClose={() => !actionLoading && setFeeOpen(false)}
        title="Edit consultation fee"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Current effective fee:{' '}
            <span className="font-semibold text-gray-900">
              {formatInr(
                pricing?.effectiveConsultationFeeInr ??
                  doctor?.effectiveConsultationFeeInr ??
                  99
              )}
            </span>
            {' '}(platform default ₹99)
          </p>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={clearFee}
              onChange={(e) => setClearFee(e.target.checked)}
            />
            Reset to platform default (₹99)
          </label>

          {!clearFee && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Consultation fee (₹)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder="99"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Doctor earning (₹, optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={earningInput}
                  onChange={(e) => setEarningInput(e.target.value)}
                  placeholder="Must be ≤ fee"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setFeeOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSaveFee}
              className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white font-semibold disabled:opacity-60"
            >
              {actionLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
