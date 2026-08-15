import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as doctorsApi from '@/services/doctorsApi';

const extractError = (error) => {
  if (error?.status === 403) return 'Admin access required';
  if (error?.status === 404) return 'Doctor not found';
  return error?.message || error?.data?.message || 'Something went wrong';
};

const emptyPatientsPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const initialState = {
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  q: '',
  verified: 'all', // 'all' | true | false
  isActive: 'all', // 'all' | true | false
  loading: false,
  error: null,
  actionLoading: false,
  profile: {
    doctorId: null,
    data: null,
    loading: false,
    error: null,
    patientsLoading: false,
  },
};

const toFilterParam = (value) => {
  if (value === true || value === false) return value;
  return undefined;
};

export const fetchAdminDoctors = createAsyncThunk(
  'adminDoctors/fetchList',
  async (
    { page = 0, size = 20, q = '', verified = 'all', isActive = 'all' } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await doctorsApi.listAdminDoctors({
        page,
        size,
        q,
        verified: toFilterParam(verified),
        isActive: toFilterParam(isActive),
      });
      const data = doctorsApi.unwrap(response) || {};
      return {
        items: Array.isArray(data.content) ? data.content : [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: Boolean(data.hasNext),
        hasPrevious: Boolean(data.hasPrevious),
        q,
        verified,
        isActive,
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchAdminDoctorProfile = createAsyncThunk(
  'adminDoctors/fetchProfile',
  async (
    { doctorId, patientsPage = 0, patientsSize = 20 } = {},
    { rejectWithValue }
  ) => {
    const id = Number(doctorId);
    if (!Number.isFinite(id) || id <= 0) {
      return rejectWithValue('Doctor ID is required');
    }
    try {
      const response = await doctorsApi.getAdminDoctorProfile(id, {
        patientsPage,
        patientsSize,
      });
      const data = doctorsApi.unwrap(response) || {};
      return {
        doctorId: id,
        profile: {
          doctor: data.doctor || null,
          pricing: data.pricing || null,
          wallet: data.wallet || null,
          calling: data.calling || null,
          attendedPatients: data.attendedPatients || emptyPatientsPage,
          prescriptionsAvailable: Boolean(data.prescriptionsAvailable),
        },
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchAdminAttendedPatients = createAsyncThunk(
  'adminDoctors/fetchAttendedPatients',
  async ({ doctorId, page = 0, size = 20 } = {}, { rejectWithValue }) => {
    const id = Number(doctorId);
    if (!Number.isFinite(id) || id <= 0) {
      return rejectWithValue('Doctor ID is required');
    }
    try {
      const response = await doctorsApi.getAdminAttendedPatients(id, { page, size });
      const data = doctorsApi.unwrap(response) || emptyPatientsPage;
      return {
        doctorId: id,
        attendedPatients: {
          content: Array.isArray(data.content) ? data.content : [],
          page: data.page ?? page,
          size: data.size ?? size,
          totalElements: data.totalElements ?? 0,
          totalPages: data.totalPages ?? 0,
          hasNext: Boolean(data.hasNext),
          hasPrevious: Boolean(data.hasPrevious),
        },
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const setAdminDoctorActive = createAsyncThunk(
  'adminDoctors/setActive',
  async ({ doctorId, isActive, reason } = {}, { rejectWithValue }) => {
    const id = Number(doctorId);
    if (!Number.isFinite(id) || id <= 0) {
      return rejectWithValue('Doctor ID is required');
    }
    if (typeof isActive !== 'boolean') {
      return rejectWithValue('isActive is required');
    }
    try {
      const response = await doctorsApi.setDoctorActive(id, { isActive, reason });
      const doctor = doctorsApi.unwrap(response) || {};
      return { doctorId: id, doctor };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateAdminDoctorPricing = createAsyncThunk(
  'adminDoctors/updatePricing',
  async ({ doctorId, body } = {}, { rejectWithValue }) => {
    const id = Number(doctorId);
    if (!Number.isFinite(id) || id <= 0) {
      return rejectWithValue('Doctor ID is required');
    }
    try {
      const response = await doctorsApi.updateDoctorPricing(id, body);
      const pricing = doctorsApi.unwrap(response) || {};
      return { doctorId: id, pricing };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const adminDoctorsSlice = createSlice({
  name: 'adminDoctors',
  initialState,
  reducers: {
    setAdminDoctorSearch: (state, action) => {
      state.q = action.payload;
      state.page = 0;
    },
    setAdminDoctorFilters: (state, action) => {
      const next = action.payload || {};
      if (next.verified !== undefined) state.verified = next.verified;
      if (next.isActive !== undefined) state.isActive = next.isActive;
      state.page = 0;
    },
    setAdminDoctorPage: (state, action) => {
      state.page = action.payload;
    },
    clearAdminDoctorProfile: (state) => {
      state.profile = {
        doctorId: null,
        data: null,
        loading: false,
        error: null,
        patientsLoading: false,
      };
    },
    clearAdminDoctorError: (state) => {
      state.error = null;
      state.profile.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.page = action.payload.page;
        state.size = action.payload.size;
        state.totalElements = action.payload.totalElements;
        state.totalPages = action.payload.totalPages;
        state.hasNext = action.payload.hasNext;
        state.hasPrevious = action.payload.hasPrevious;
        state.q = action.payload.q;
        state.verified = action.payload.verified;
        state.isActive = action.payload.isActive;
      })
      .addCase(fetchAdminDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAdminDoctorProfile.pending, (state, action) => {
        state.profile.loading = true;
        state.profile.error = null;
        state.profile.doctorId = action.meta.arg?.doctorId ?? null;
      })
      .addCase(fetchAdminDoctorProfile.fulfilled, (state, action) => {
        state.profile.loading = false;
        state.profile.doctorId = action.payload.doctorId;
        state.profile.data = action.payload.profile;
      })
      .addCase(fetchAdminDoctorProfile.rejected, (state, action) => {
        state.profile.loading = false;
        state.profile.error = action.payload;
      })
      .addCase(fetchAdminAttendedPatients.pending, (state) => {
        state.profile.patientsLoading = true;
      })
      .addCase(fetchAdminAttendedPatients.fulfilled, (state, action) => {
        state.profile.patientsLoading = false;
        if (state.profile.data && state.profile.doctorId === action.payload.doctorId) {
          state.profile.data.attendedPatients = action.payload.attendedPatients;
        }
      })
      .addCase(fetchAdminAttendedPatients.rejected, (state, action) => {
        state.profile.patientsLoading = false;
        state.profile.error = action.payload;
      })
      .addCase(setAdminDoctorActive.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(setAdminDoctorActive.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload.doctor;
        const id = action.payload.doctorId;
        state.items = state.items.map((d) =>
          d.doctorId === id ? { ...d, ...updated } : d
        );
        if (state.profile.data?.doctor?.doctorId === id) {
          state.profile.data.doctor = {
            ...state.profile.data.doctor,
            ...updated,
          };
        }
      })
      .addCase(setAdminDoctorActive.rejected, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateAdminDoctorPricing.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateAdminDoctorPricing.fulfilled, (state, action) => {
        state.actionLoading = false;
        const pricing = action.payload.pricing;
        const id = action.payload.doctorId;
        if (state.profile.data && state.profile.doctorId === id) {
          state.profile.data.pricing = {
            ...(state.profile.data.pricing || {}),
            ...pricing,
          };
          if (state.profile.data.doctor) {
            state.profile.data.doctor.effectiveConsultationFeeInr =
              pricing.effectiveConsultationFeeInr ??
              state.profile.data.doctor.effectiveConsultationFeeInr;
            state.profile.data.doctor.effectiveEarningInr =
              pricing.effectiveEarningInr ??
              state.profile.data.doctor.effectiveEarningInr;
          }
        }
        state.items = state.items.map((d) =>
          d.doctorId === id
            ? {
                ...d,
                effectiveConsultationFeeInr:
                  pricing.effectiveConsultationFeeInr ?? d.effectiveConsultationFeeInr,
                effectiveEarningInr:
                  pricing.effectiveEarningInr ?? d.effectiveEarningInr,
              }
            : d
        );
      })
      .addCase(updateAdminDoctorPricing.rejected, (state) => {
        state.actionLoading = false;
      });
  },
});

export const {
  setAdminDoctorSearch,
  setAdminDoctorFilters,
  setAdminDoctorPage,
  clearAdminDoctorProfile,
  clearAdminDoctorError,
} = adminDoctorsSlice.actions;

export default adminDoctorsSlice.reducer;
