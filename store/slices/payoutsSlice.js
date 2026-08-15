import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as payoutsApi from '@/services/payoutsApi';

const extractError = (error) =>
  error?.message || error?.data?.message || 'Something went wrong';

const initialState = {
  pending: {
    items: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
    loading: false,
    error: null,
  },
  /** Badge / lightweight count */
  pendingCount: 0,
  pendingCountLoading: false,
  actionLoading: false,
  pricing: {
    data: null,
    loading: false,
    saving: false,
    error: null,
  },
  payments: {
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    loading: false,
    error: null,
  },
};

export const fetchPendingPayouts = createAsyncThunk(
  'payouts/fetchPending',
  async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.getPendingPayouts(page, size);
      const data = payoutsApi.unwrap(response);
      return {
        items: data.content || [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: data.hasNext ?? false,
        hasPrevious: data.hasPrevious ?? false,
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

/** Lightweight fetch for sidebar badge */
export const fetchPendingPayoutCount = createAsyncThunk(
  'payouts/fetchPendingCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.getPendingPayouts(0, 1);
      const data = payoutsApi.unwrap(response);
      return data.totalElements ?? 0;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchPayoutSecret = createAsyncThunk(
  'payouts/fetchSecret',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.getPayoutSecret(doctorId);
      const data = payoutsApi.unwrap(response);
      return data?.secret ?? null;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const markPayoutPaid = createAsyncThunk(
  'payouts/markPaid',
  async ({ payoutId, utr, note, invoiceFile }, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.markPayoutPaid(payoutId, { utr, note, invoiceFile });
      return payoutsApi.unwrap(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const markPayoutFailed = createAsyncThunk(
  'payouts/markFailed',
  async ({ payoutId, reason }, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.markPayoutFailed(payoutId, reason);
      return payoutsApi.unwrap(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchDoctorPricing = createAsyncThunk(
  'payouts/fetchPricing',
  async (doctorId, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.getDoctorPricing(doctorId);
      return payoutsApi.unwrap(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateDoctorPricing = createAsyncThunk(
  'payouts/updatePricing',
  async ({ doctorId, body }, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.updateDoctorPricing(doctorId, body);
      return payoutsApi.unwrap(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchAdminPayments = createAsyncThunk(
  'payouts/fetchPayments',
  async ({ page = 0, size = 50 } = {}, { rejectWithValue }) => {
    try {
      const response = await payoutsApi.getAdminPayments(page, size);
      const data = payoutsApi.unwrap(response);
      return {
        items: data.content || [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const payoutsSlice = createSlice({
  name: 'payouts',
  initialState,
  reducers: {
    clearPricing: (state) => {
      state.pricing = { data: null, loading: false, saving: false, error: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingPayouts.pending, (state) => {
        state.pending.loading = true;
        state.pending.error = null;
      })
      .addCase(fetchPendingPayouts.fulfilled, (state, action) => {
        state.pending.loading = false;
        state.pending.items = action.payload.items;
        state.pending.page = action.payload.page;
        state.pending.size = action.payload.size;
        state.pending.totalElements = action.payload.totalElements;
        state.pending.totalPages = action.payload.totalPages;
        state.pending.hasNext = action.payload.hasNext;
        state.pending.hasPrevious = action.payload.hasPrevious;
        state.pendingCount = action.payload.totalElements;
      })
      .addCase(fetchPendingPayouts.rejected, (state, action) => {
        state.pending.loading = false;
        state.pending.error = action.payload;
      })
      .addCase(fetchPendingPayoutCount.pending, (state) => {
        state.pendingCountLoading = true;
      })
      .addCase(fetchPendingPayoutCount.fulfilled, (state, action) => {
        state.pendingCountLoading = false;
        state.pendingCount = action.payload;
      })
      .addCase(fetchPendingPayoutCount.rejected, (state) => {
        state.pendingCountLoading = false;
      })
      .addCase(markPayoutPaid.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(markPayoutPaid.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.pending.items = state.pending.items.filter((p) => p.id !== action.payload?.id);
        state.pending.totalElements = Math.max(0, state.pending.totalElements - 1);
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      })
      .addCase(markPayoutPaid.rejected, (state) => {
        state.actionLoading = false;
      })
      .addCase(markPayoutFailed.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(markPayoutFailed.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.pending.items = state.pending.items.filter((p) => p.id !== action.payload?.id);
        state.pending.totalElements = Math.max(0, state.pending.totalElements - 1);
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      })
      .addCase(markPayoutFailed.rejected, (state) => {
        state.actionLoading = false;
      })
      .addCase(fetchDoctorPricing.pending, (state) => {
        state.pricing.loading = true;
        state.pricing.error = null;
      })
      .addCase(fetchDoctorPricing.fulfilled, (state, action) => {
        state.pricing.loading = false;
        state.pricing.data = action.payload;
      })
      .addCase(fetchDoctorPricing.rejected, (state, action) => {
        state.pricing.loading = false;
        state.pricing.error = action.payload;
      })
      .addCase(updateDoctorPricing.pending, (state) => {
        state.pricing.saving = true;
      })
      .addCase(updateDoctorPricing.fulfilled, (state, action) => {
        state.pricing.saving = false;
        state.pricing.data = action.payload;
      })
      .addCase(updateDoctorPricing.rejected, (state) => {
        state.pricing.saving = false;
      })
      .addCase(fetchAdminPayments.pending, (state) => {
        state.payments.loading = true;
        state.payments.error = null;
      })
      .addCase(fetchAdminPayments.fulfilled, (state, action) => {
        state.payments.loading = false;
        state.payments.items = action.payload.items;
        state.payments.page = action.payload.page;
        state.payments.size = action.payload.size;
        state.payments.totalElements = action.payload.totalElements;
      })
      .addCase(fetchAdminPayments.rejected, (state, action) => {
        state.payments.loading = false;
        state.payments.error = action.payload;
      });
  },
});

export const { clearPricing } = payoutsSlice.actions;
export default payoutsSlice.reducer;
