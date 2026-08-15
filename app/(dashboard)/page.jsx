'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDashboardOverview } from '@/store/slices/dashboardSlice';
import { formatInr, formatTalkTimeSeconds } from '@/services/dashboardApi';
import {
  Users,
  UserCheck,
  Stethoscope,
  Wallet,
  TrendingUp,
  Phone,
  Clock,
  IndianRupee,
  UserX,
  Ban,
  RefreshCw,
  AlertTriangle,
  CircleDot,
  FileText,
  LayoutDashboard,
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, sub, icon: Icon, tone = 'primary', unavailable = false }) => {
  const tones = {
    primary: 'from-primary-400 to-primary-600',
    amber: 'from-amber-400 to-orange-500',
    purple: 'from-purple-400 to-purple-600',
    rose: 'from-rose-400 to-rose-600',
    emerald: 'from-emerald-400 to-emerald-600',
    sky: 'from-sky-400 to-sky-600',
    slate: 'from-slate-400 to-slate-600',
  };

  return (
    <div className="bg-white rounded-xl soft-shadow-lg p-5 border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 truncate">
            {unavailable ? '—' : value}
          </p>
          {unavailable ? (
            <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unavailable
            </p>
          ) : sub ? (
            <p className="text-xs text-gray-500 mt-1.5">{sub}</p>
          ) : null}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tones[tone] || tones.primary} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const formatGeneratedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { overview, loading, error } = useAppSelector((state) => state.dashboard || {});
  const lastErrorRef = useRef(null);

  useEffect(() => {
    dispatch(fetchDashboardOverview({ range: 'all' }));
  }, [dispatch]);

  useEffect(() => {
    if (error && lastErrorRef.current !== error) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const handleRefresh = () => {
    dispatch(fetchDashboardOverview({ range: 'all' }));
    toast.success('Refreshing dashboard…');
  };

  const d = overview?.doctors;
  const patients = overview?.patients;
  const calls = overview?.calls;
  const revenue = overview?.revenue;
  const payouts = overview?.payouts;
  const wallet = overview?.walletLiability;
  const content = overview?.content;
  const attention = overview?.attention;

  const patientsUnavailable = patients && patients.available === false;
  const callsUnavailable = !calls || calls.available === false;
  const contentUnavailable = !content || content.available === false;
  const walletUnavailable = !wallet || wallet.available === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Overview</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Live Docspot admin metrics
            {overview?.generatedAt
              ? ` · Updated ${formatGeneratedAt(overview.generatedAt)}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !overview && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading live dashboard…</p>
        </div>
      )}

      {!loading && error && !overview && (
        <div className="bg-white rounded-2xl border border-rose-100 p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {overview && (
        <>
          {/* Attention strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/doctor-activation"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100/80 transition-colors"
            >
              <p className="text-xs font-semibold uppercase text-amber-800 tracking-wide">
                Needs review
              </p>
              <p className="text-lg font-bold text-amber-950 mt-1">
                {attention?.pendingDoctorVerifications ?? d?.pendingVerification ?? 0}{' '}
                <span className="text-sm font-medium">pending verifications</span>
              </p>
            </Link>
            <Link
              href="/payment-requests"
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 hover:bg-sky-100/80 transition-colors"
            >
              <p className="text-xs font-semibold uppercase text-sky-800 tracking-wide">
                Payouts
              </p>
              <p className="text-lg font-bold text-sky-950 mt-1">
                {attention?.pendingPayouts ?? payouts?.pendingCount ?? 0}{' '}
                <span className="text-sm font-medium">
                  pending · {formatInr(payouts?.pendingAmountInr)}
                </span>
              </p>
            </Link>
            <Link
              href="/doctors"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 hover:bg-rose-100/80 transition-colors"
            >
              <p className="text-xs font-semibold uppercase text-rose-800 tracking-wide">
                Doctors
              </p>
              <p className="text-lg font-bold text-rose-950 mt-1">
                {attention?.inactiveDoctors ?? d?.inactive ?? 0}{' '}
                <span className="text-sm font-medium">inactive</span>
              </p>
            </Link>
          </div>

          {/* Core KPIs */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Pending verifications"
                value={attention?.pendingDoctorVerifications ?? d?.pendingVerification ?? 0}
                icon={UserCheck}
                tone="amber"
              />
              <StatCard
                title="Total patients"
                value={patients?.totalRegistered ?? 0}
                unavailable={patientsUnavailable}
                icon={Users}
                tone="primary"
              />
              <StatCard
                title="Active doctors"
                value={d?.active ?? 0}
                sub={`${d?.verified ?? 0} verified · ${d?.inactive ?? 0} inactive`}
                icon={Stethoscope}
                tone="purple"
              />
              <StatCard
                title="Rejected applications"
                value={d?.rejectedApplications ?? 0}
                icon={Ban}
                tone="rose"
              />
            </div>
          </div>

          {/* Presence */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Doctor presence
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Online"
                value={d?.presence?.online ?? 0}
                icon={CircleDot}
                tone="emerald"
              />
              <StatCard
                title="Busy"
                value={d?.presence?.busy ?? 0}
                icon={CircleDot}
                tone="amber"
              />
              <StatCard
                title="Offline"
                value={d?.presence?.offline ?? 0}
                icon={UserX}
                tone="slate"
              />
            </div>
          </div>

          {/* Money — keep revenue vs payouts separate */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Revenue (money in)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Lifetime collected"
                value={formatInr(revenue?.lifetimeCollectedInr)}
                icon={TrendingUp}
                tone="emerald"
              />
              <StatCard
                title="Average ticket"
                value={formatInr(revenue?.averageTicketInr)}
                icon={IndianRupee}
                tone="sky"
              />
              <StatCard
                title="Successful payments"
                value={revenue?.successfulPaymentCount ?? 0}
                icon={IndianRupee}
                tone="primary"
              />
              <StatCard
                title="Failed / refunded"
                value={revenue?.failedOrRefundedPaymentCount ?? 0}
                icon={AlertTriangle}
                tone="rose"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Payouts (money out)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Pending payouts"
                value={payouts?.pendingCount ?? 0}
                sub={formatInr(payouts?.pendingAmountInr)}
                icon={Wallet}
                tone="amber"
              />
              <StatCard
                title="Paid lifetime"
                value={formatInr(payouts?.paidAmountLifetimeInr)}
                sub={`${payouts?.paidCountLifetime ?? 0} payouts`}
                icon={Wallet}
                tone="emerald"
              />
              <StatCard
                title="Wallet liability"
                value={formatInr(wallet?.totalAvailableBalanceInr)}
                unavailable={walletUnavailable}
                sub="Doctor available balances"
                icon={Wallet}
                tone="purple"
              />
              <StatCard
                title="Pending withdrawals"
                value={formatInr(wallet?.totalPendingWithdrawalInr)}
                unavailable={walletUnavailable}
                icon={Wallet}
                tone="sky"
              />
            </div>
          </div>

          {/* Calls */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Calls
            </h2>
            {callsUnavailable && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Call stats temporarily unavailable
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Completed calls"
                value={calls?.completedCalls ?? 0}
                unavailable={callsUnavailable}
                icon={Phone}
                tone="emerald"
              />
              <StatCard
                title="Total calls"
                value={calls?.totalCalls ?? 0}
                unavailable={callsUnavailable}
                icon={Phone}
                tone="primary"
              />
              <StatCard
                title="Unique patients (calls)"
                value={calls?.uniquePatients ?? 0}
                unavailable={callsUnavailable}
                icon={Users}
                tone="sky"
              />
              <StatCard
                title="Talk time"
                value={formatTalkTimeSeconds(calls?.totalTalkTimeSeconds)}
                unavailable={callsUnavailable}
                icon={Clock}
                tone="purple"
              />
            </div>
          </div>

          {/* Content */}
          {!contentUnavailable && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Content
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Active ads"
                  value={content?.activeAds ?? 0}
                  icon={FileText}
                  tone="amber"
                />
                <StatCard
                  title="Active tips"
                  value={content?.activeTips ?? 0}
                  icon={FileText}
                  tone="sky"
                />
                <StatCard
                  title="Published articles"
                  value={content?.publishedArticles ?? 0}
                  icon={FileText}
                  tone="emerald"
                />
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl soft-shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/doctor-activation"
                className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Review doctor activations</p>
                <p className="text-sm text-gray-600 mt-1">
                  {attention?.pendingDoctorVerifications ?? 0} pending
                </p>
              </Link>
              <Link
                href="/payment-requests"
                className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Payment requests</p>
                <p className="text-sm text-gray-600 mt-1">
                  {attention?.pendingPayouts ?? 0} pending ·{' '}
                  {formatInr(payouts?.pendingAmountInr)}
                </p>
              </Link>
              <Link
                href="/doctors"
                className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Manage doctors</p>
                <p className="text-sm text-gray-600 mt-1">
                  {attention?.inactiveDoctors ?? 0} inactive · fees & status
                </p>
              </Link>
              <Link
                href="/patients"
                className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <p className="font-medium text-gray-900">Patients</p>
                <p className="text-sm text-gray-600 mt-1">
                  {patientsUnavailable
                    ? 'Directory unavailable'
                    : `${patients?.totalRegistered ?? 0} registered`}
                </p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
