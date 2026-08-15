'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPendingPayouts,
  fetchPayoutSecret,
  markPayoutPaid,
  markPayoutFailed,
  fetchDoctorPricing,
  updateDoctorPricing,
  fetchAdminPayments,
  clearPricing,
} from '@/store/slices/payoutsSlice';
import { fetchVerifiedDoctors } from '@/store/slices/verifiedDoctorsSlice';
import Modal from '@/components/Modal';
import Table from '@/components/Table';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  Smartphone,
  XCircle,
  IndianRupee,
  User,
  Shield,
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

const INVOICE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export default function PaymentRequestDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const payoutId = Number(params?.id);
  const doctorIdFromQuery = searchParams?.get('doctorId');

  const { items, loading: listLoading } = useAppSelector((state) => state.payouts?.pending || {});
  const actionLoading = useAppSelector((state) => state.payouts?.actionLoading);
  const pricing = useAppSelector((state) => state.payouts?.pricing || {});
  const paymentsState = useAppSelector((state) => state.payouts?.payments || {});
  const verifiedDoctors = useAppSelector((state) => state.verifiedDoctors?.doctors || []);

  const payout = useMemo(
    () => items.find((p) => p.id === payoutId) || null,
    [items, payoutId]
  );

  const doctorId = payout?.doctorId ?? (doctorIdFromQuery ? Number(doctorIdFromQuery) : null);

  const doctor = useMemo(() => {
    if (!doctorId) return null;
    return verifiedDoctors.find((d) => d.id === doctorId || d.doctorId === doctorId) || null;
  }, [verifiedDoctors, doctorId]);

  const relatedPayments = useMemo(() => {
    if (!doctorId) return [];
    return (paymentsState.items || []).filter((p) => p.doctorId === doctorId);
  }, [paymentsState.items, doctorId]);

  const [revealOpen, setRevealOpen] = useState(false);
  const [secretValue, setSecretValue] = useState(null);
  const [secretLoading, setSecretLoading] = useState(false);

  const [approveOpen, setApproveOpen] = useState(false);
  const [utr, setUtr] = useState('');
  const [note, setNote] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [feeInput, setFeeInput] = useState('');
  const [earningInput, setEarningInput] = useState('');

  const mountedRef = useRef(false);

  const ensurePendingLoaded = useCallback(() => {
    if (!items.length && !listLoading) {
      dispatch(fetchPendingPayouts({ page: 0, size: 50 }));
    }
  }, [dispatch, items.length, listLoading]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    ensurePendingLoaded();
    dispatch(fetchVerifiedDoctors({ page: 0, size: 100 }));
    dispatch(fetchAdminPayments({ page: 0, size: 50 }));
  }, [dispatch, ensurePendingLoaded]);

  useEffect(() => {
    if (doctorId) {
      dispatch(fetchDoctorPricing(doctorId));
    }
    return () => {
      dispatch(clearPricing());
    };
  }, [dispatch, doctorId]);

  useEffect(() => {
    if (pricing.data) {
      setFeeInput(
        pricing.data.consultationFeeInrOverride != null
          ? String(pricing.data.consultationFeeInrOverride)
          : ''
      );
      setEarningInput(
        pricing.data.earningInrOverride != null
          ? String(pricing.data.earningInrOverride)
          : ''
      );
    }
  }, [pricing.data]);

  const clearSecret = () => {
    setSecretValue(null);
    setRevealOpen(false);
  };

  const handleReveal = async () => {
    if (!doctorId) return;
    setSecretLoading(true);
    setRevealOpen(true);
    try {
      const secret = await dispatch(fetchPayoutSecret(doctorId)).unwrap();
      setSecretValue(secret);
    } catch (err) {
      toast.error(err || 'Failed to reveal payout details');
      clearSecret();
    } finally {
      setSecretLoading(false);
    }
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleInvoiceChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!INVOICE_TYPES.includes(file.type)) {
      toast.error('Receipt must be PDF, JPG, or PNG');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Receipt must be under 2MB');
      e.target.value = '';
      return;
    }
    setInvoiceFile(file);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        markPayoutPaid({
          payoutId,
          utr: utr.trim() || undefined,
          note: note.trim() || undefined,
          invoiceFile: invoiceFile || undefined,
        })
      ).unwrap();
      toast.success(
        'Marked paid. Receipt emailed to the doctor if a file was attached.'
      );
      setApproveOpen(false);
      setUtr('');
      setNote('');
      setInvoiceFile(null);
      router.push('/payment-requests');
    } catch (err) {
      toast.error(err || 'Failed to mark paid');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await dispatch(
        markPayoutFailed({ payoutId, reason: rejectReason.trim() })
      ).unwrap();
      toast.success('Withdrawal rejected — amount returned to doctor wallet');
      setRejectOpen(false);
      setRejectReason('');
      router.push('/payment-requests');
    } catch (err) {
      toast.error(err || 'Failed to reject');
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!doctorId) return;
    const body = {};
    if (feeInput !== '') body.consultationFeeInr = Number(feeInput);
    if (earningInput !== '') body.earningInr = Number(earningInput);
    if (feeInput === '' && earningInput === '') {
      toast.error('Enter a fee or earning, or use Reset to defaults');
      return;
    }
    try {
      await dispatch(updateDoctorPricing({ doctorId, body })).unwrap();
      toast.success('Doctor pricing updated');
    } catch (err) {
      toast.error(err || 'Failed to update pricing');
    }
  };

  const handleResetPricing = async () => {
    if (!doctorId) return;
    try {
      await dispatch(
        updateDoctorPricing({
          doctorId,
          body: { clearConsultationFee: true, clearEarning: true },
        })
      ).unwrap();
      setFeeInput('');
      setEarningInput('');
      toast.success('Pricing reset to defaults');
    } catch (err) {
      toast.error(err || 'Failed to reset pricing');
    }
  };

  const method = payout?.payoutMethodMasked;
  const isPending = payout?.status === 'PENDING';

  if (listLoading && !payout) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading request...</p>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="space-y-4">
        <Link
          href="/payment-requests"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payment Requests
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="font-semibold text-gray-800">Request not found</p>
          <p className="text-sm text-gray-500 mt-2">
            It may already be paid or rejected, or is on another page of the pending list.
          </p>
        </div>
      </div>
    );
  }

  const paymentColumns = [
    {
      header: 'ID',
      accessor: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      header: 'Patient',
      accessor: (row) => row.patientId || '—',
    },
    {
      header: 'Amount',
      accessor: (row) => formatInr(row.amountInr),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
          {row.status}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/payment-requests"
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Payment Requests
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawal #{payout.id}</h1>
          <p className="text-gray-600 mt-1">{payout.doctorName}</p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            isPending
              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
              : payout.status === 'PAID'
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                : 'bg-red-50 text-red-800 ring-1 ring-red-200'
          }`}
        >
          {payout.status}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-primary-600" />
              Withdrawal summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-primary-50 p-4">
                <p className="text-xs text-primary-600 font-medium uppercase">Amount</p>
                <p className="text-2xl font-bold text-primary-800 mt-1">
                  {formatInr(payout.amountInr)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Requested</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">
                  {formatDateTime(payout.requestedAt)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Doctor ID</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{payout.doctorId}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {method?.type === 'UPI' ? (
                  <Smartphone className="w-5 h-5 text-violet-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-sky-600" />
                )}
                Payout destination
              </h2>
              {isPending && (
                <button
                  type="button"
                  onClick={handleReveal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-500 rounded-xl hover:shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  Reveal full bank / UPI
                </button>
              )}
            </div>

            {method ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold">{method.type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Account holder</span>
                  <span className="font-semibold">{method.accountHolderName || '—'}</span>
                </div>
                {method.type === 'BANK' ? (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-semibold">{method.bankName || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">IFSC</span>
                      <span className="font-mono font-semibold">
                        {method.ifsc || method.ifscMasked || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Account</span>
                      <span className="font-mono font-semibold">
                        {method.accountMasked ||
                          (method.accountLast4 ? `****${method.accountLast4}` : '—')}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">UPI</span>
                    <span className="font-mono font-semibold">
                      {method.upiHandleMasked || '—'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No payout method on file.</p>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Related consultation payments</h2>
            <p className="text-xs text-gray-500 mb-4">
              Client-filtered from all payments. TODO: server filter{' '}
              <code className="bg-gray-100 px-1 rounded">?doctorId=</code>
            </p>
            {paymentsState.loading ? (
              <p className="text-sm text-gray-500">Loading payments...</p>
            ) : relatedPayments.length === 0 ? (
              <p className="text-sm text-gray-500">No related payments found in loaded page.</p>
            ) : (
              <Table columns={paymentColumns} data={relatedPayments.slice(0, 10)} />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Doctor
            </h2>
            <div className="flex items-start gap-3 mb-4">
              {doctor?.profilePicture ? (
                <img
                  src={doctor.profilePicture}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900">{doctor?.name || payout.doctorName}</p>
                <p className="text-xs text-gray-500">ID {doctorId}</p>
                {doctor?.status && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                    {doctor.status}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {doctor?.email && (
                <p>
                  <span className="text-gray-500">Email:</span>{' '}
                  <span className="font-medium">{doctor.email}</span>
                </p>
              )}
              {(doctor?.mobileNumber || doctor?.mobile) && (
                <p>
                  <span className="text-gray-500">Mobile:</span>{' '}
                  <span className="font-medium">{doctor.mobileNumber || doctor.mobile}</span>
                </p>
              )}
              {doctor?.registrationNumber && (
                <p>
                  <span className="text-gray-500">Reg. no:</span>{' '}
                  <span className="font-medium">{doctor.registrationNumber}</span>
                </p>
              )}
              {(doctor?.departmentName || doctor?.department) && (
                <p>
                  <span className="text-gray-500">Dept:</span>{' '}
                  <span className="font-medium">
                    {doctor.departmentName || doctor.department}
                  </span>
                </p>
              )}
            </div>
            <Link
              href="/doctors"
              className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Open Doctors page →
            </Link>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Pricing
            </h2>
            {pricing.loading ? (
              <p className="text-sm text-gray-500">Loading pricing...</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                  Effective fee{' '}
                  <strong>{formatInr(pricing.data?.effectiveConsultationFeeInr)}</strong>
                  {' · '}
                  Effective earning{' '}
                  <strong>{formatInr(pricing.data?.effectiveEarningInr)}</strong>
                </p>
                <form onSubmit={handleSavePricing} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Patient consultation fee (₹)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={feeInput}
                      onChange={(e) => setFeeInput(e.target.value)}
                      placeholder="Leave empty = default"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Doctor earning per qualifying call (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={earningInput}
                      onChange={(e) => setEarningInput(e.target.value)}
                      placeholder="Leave empty = default"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={pricing.saving}
                      className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl disabled:opacity-60"
                    >
                      {pricing.saving ? 'Saving...' : 'Save pricing'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPricing}
                      disabled={pricing.saving}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                    >
                      Reset to defaults
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>

          {isPending && (
            <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6 space-y-3">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Actions</h2>
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl hover:shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Approve & Mark Paid
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </section>
          )}
        </div>
      </div>

      <Modal isOpen={revealOpen} onClose={clearSecret} title="Full payout details" size="md">
        <div className="space-y-4">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-2">
            <EyeOff className="w-4 h-4 mt-0.5 shrink-0" />
            Use this only to complete a manual transfer. Details clear when you close this dialog.
          </p>
          {secretLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
            </div>
          ) : secretValue ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">
                  {method?.type === 'UPI' ? 'Full UPI handle' : 'Full account number'}
                </p>
                <p className="font-mono text-lg font-bold text-gray-900 break-all select-all">
                  {secretValue}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(secretValue, method?.type === 'UPI' ? 'UPI' : 'Account')
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                {method?.type === 'BANK' && (method.ifsc || method.ifscMasked) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(method.ifsc || method.ifscMasked, 'IFSC')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy IFSC
                  </button>
                )}
                {method?.accountHolderName && (
                  <button
                    type="button"
                    onClick={() => handleCopy(method.accountHolderName, 'Name')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy name
                  </button>
                )}
              </div>
              {method?.type === 'BANK' && (
                <p className="text-sm text-gray-600">
                  {method.bankName} · IFSC {method.ifsc || method.ifscMasked}
                </p>
              )}
            </div>
          ) : null}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={clearSecret}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Close & clear
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={approveOpen}
        onClose={() => {
          setApproveOpen(false);
          setInvoiceFile(null);
        }}
        title="Approve & Mark Paid"
        size="md"
      >
        <form onSubmit={handleApprove} className="space-y-4">
          <p className="text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            Pay <strong>{formatInr(payout.amountInr)}</strong> to this doctor using your bank /
            UPI dashboard. After the transfer succeeds, enter UTR and optionally attach a
            receipt to email the doctor, then confirm.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              UTR / reference
            </label>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. HDFC123456789"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via IMPS"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email receipt to doctor
            </label>
            <p className="text-xs text-gray-500 mb-2">
              This file is emailed to the doctor. It is not saved in DocSpot. PDF, JPG, or PNG
              (max 2MB).
            </p>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/jpg"
              onChange={handleInvoiceChange}
              className="text-sm text-gray-600"
            />
            {invoiceFile && (
              <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Will email: {invoiceFile.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setApproveOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl disabled:opacity-60"
            >
              {actionLoading ? 'Confirming...' : 'Confirm paid'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject withdrawal"
        size="md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-sm text-gray-600">
            Amount will return to the doctor&apos;s available wallet. Doctor will be emailed the
            reason.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Account number mismatch / Invalid IFSC"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60"
            >
              {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
