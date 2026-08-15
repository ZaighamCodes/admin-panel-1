import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as patientsApi from '@/services/patientsApi';

const extractError = (error) => {
  if (error?.status === 403) return 'Admin access required';
  if (error?.status === 404) return 'Patient not found';
  if (error?.status === 503) {
    return error?.message || 'Patient records are temporarily unavailable';
  }
  return error?.message || error?.data?.message || 'Something went wrong';
};

const initialState = {
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  q: '',
  loading: false,
  error: null,
  overview: {
    byPatientId: {},
    loading: false,
    error: null,
    currentId: null,
  },
};

export const fetchAdminPatients = createAsyncThunk(
  'patients/fetchList',
  async ({ page = 0, size = 20, q = '' } = {}, { rejectWithValue }) => {
    try {
      const response = await patientsApi.listAdminPatients(page, size, q);
      const data = patientsApi.unwrap(response) || {};
      return {
        items: Array.isArray(data.content) ? data.content : [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        q,
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchPatientOverview = createAsyncThunk(
  'patients/fetchOverview',
  async ({ patientId, force = false } = {}, { getState, rejectWithValue }) => {
    const id = String(patientId || '').trim();
    if (!id) return rejectWithValue('Patient ID is required');

    const cached = getState().patients.overview.byPatientId[id];
    if (cached && !force) {
      return { patientId: id, overview: cached, fromCache: true };
    }

    try {
      const response = await patientsApi.getAdminPatientOverview(id);
      const data = patientsApi.unwrap(response) || {};
      return {
        patientId: id,
        fromCache: false,
        overview: {
          patient: data.patient || null,
          documents: Array.isArray(data.documents) ? data.documents : [],
          prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
          documentCount: data.documentCount ?? (data.documents?.length || 0),
          prescriptionCount: data.prescriptionCount ?? (data.prescriptions?.length || 0),
        },
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    setPatientSearch: (state, action) => {
      state.q = action.payload;
      state.page = 0;
    },
    setPatientPage: (state, action) => {
      state.page = action.payload;
    },
    clearPatientOverviewError: (state) => {
      state.overview.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.page = action.payload.page;
        state.size = action.payload.size;
        state.totalElements = action.payload.totalElements;
        state.totalPages = action.payload.totalPages;
        state.q = action.payload.q;
      })
      .addCase(fetchAdminPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPatientOverview.pending, (state, action) => {
        state.overview.loading = true;
        state.overview.error = null;
        state.overview.currentId = action.meta.arg?.patientId || null;
      })
      .addCase(fetchPatientOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.currentId = action.payload.patientId;
        if (!action.payload.fromCache) {
          state.overview.byPatientId[action.payload.patientId] = action.payload.overview;
        }
      })
      .addCase(fetchPatientOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload;
      });
  },
});

export const { setPatientSearch, setPatientPage, clearPatientOverviewError } =
  patientsSlice.actions;

export default patientsSlice.reducer;
