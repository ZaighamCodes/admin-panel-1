import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as dashboardApi from '@/services/dashboardApi';

const extractError = (error) => {
  if (error?.status === 403) return 'Admin access required';
  if (error?.status === 401) return 'Unauthorized. JWT token required.';
  return error?.message || error?.data?.message || 'Failed to load dashboard';
};

const emptyOverview = () => ({
  generatedAt: null,
  range: 'all',
  doctors: {
    pendingVerification: 0,
    verified: 0,
    active: 0,
    inactive: 0,
    rejectedApplications: 0,
    presence: { online: 0, busy: 0, offline: 0 },
  },
  patients: { available: false, totalRegistered: 0 },
  calls: {
    available: false,
    totalCalls: 0,
    completedCalls: 0,
    cancelledCalls: 0,
    rejectedCalls: 0,
    failedCalls: 0,
    uniquePatients: 0,
    totalTalkTimeSeconds: 0,
  },
  revenue: {
    lifetimeCollectedInr: 0,
    rangeCollectedInr: 0,
    successfulPaymentCount: 0,
    failedOrRefundedPaymentCount: 0,
    averageTicketInr: 0,
  },
  payouts: {
    pendingCount: 0,
    pendingAmountInr: 0,
    paidCountLifetime: 0,
    paidAmountLifetimeInr: 0,
    failedCountLifetime: 0,
  },
  walletLiability: {
    available: false,
    totalAvailableBalanceInr: 0,
    totalPendingWithdrawalInr: 0,
  },
  content: {
    available: false,
    activeAds: 0,
    activeTips: 0,
    publishedArticles: 0,
  },
  attention: {
    pendingDoctorVerifications: 0,
    pendingPayouts: 0,
    inactiveDoctors: 0,
  },
  recentActivity: [],
  trend: { available: false, points: [] },
});

const normalizeOverview = (raw) => {
  const d = raw && typeof raw === 'object' ? raw : {};
  const base = emptyOverview();

  return {
    generatedAt: d.generatedAt || null,
    range: d.range || 'all',
    doctors: {
      ...base.doctors,
      ...(d.doctors || {}),
      presence: {
        ...base.doctors.presence,
        ...(d.doctors?.presence || {}),
      },
    },
    patients: { ...base.patients, ...(d.patients || {}) },
    calls: { ...base.calls, ...(d.calls || {}) },
    revenue: { ...base.revenue, ...(d.revenue || {}) },
    payouts: { ...base.payouts, ...(d.payouts || {}) },
    walletLiability: { ...base.walletLiability, ...(d.walletLiability || {}) },
    content: { ...base.content, ...(d.content || {}) },
    attention: { ...base.attention, ...(d.attention || {}) },
    recentActivity: Array.isArray(d.recentActivity) ? d.recentActivity : [],
    trend: {
      available: Boolean(d.trend?.available),
      points: Array.isArray(d.trend?.points) ? d.trend.points : [],
    },
  };
};

const initialState = {
  overview: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchDashboardOverview = createAsyncThunk(
  'dashboard/fetchOverview',
  async ({ range = 'all' } = {}, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getAdminDashboardOverview(range);
      const data = dashboardApi.unwrap(response);
      return normalizeOverview(data);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load dashboard';
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
