import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as contentApi from '@/services/contentApi';

const extractError = (error) =>
  error?.message || error?.data?.message || 'Something went wrong';

const initialState = {
  articles: {
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    loading: false,
    saving: false,
    error: null,
    filters: { search: '', category: '' },
    categories: [],
    categoriesLoading: false,
    fetchKey: null,
  },
  advertisements: {
    audience: 'PATIENT',
    patient: { items: [], loading: false, error: null, fetched: false },
    doctor: { items: [], loading: false, error: null, fetched: false },
    saving: false,
    detailLoading: false,
  },
};

// ——— Articles ———

export const fetchArticles = createAsyncThunk(
  'content/fetchArticles',
  async (params, { getState, rejectWithValue }) => {
    try {
      const { page, size, search, category } = params || {};
      const state = getState().content.articles;
      const resolvedPage = page ?? state.page;
      const resolvedSize = size ?? state.size;
      const resolvedSearch = search !== undefined ? search : state.filters.search;
      const resolvedCategory = category !== undefined ? category : state.filters.category;

      const fetchKey = `${resolvedPage}|${resolvedSize}|${resolvedSearch}|${resolvedCategory}`;
      if (state.fetchKey === fetchKey && state.items.length > 0 && !params?.force) {
        return { cached: true, fetchKey };
      }

      const response = await contentApi.getHealthArticles({
        page: resolvedPage,
        size: resolvedSize,
        search: resolvedSearch || undefined,
        category: resolvedCategory || undefined,
      });
      const data = response.data?.data || response.data;
      return {
        items: data.content || [],
        page: data.page ?? resolvedPage,
        size: data.size ?? resolvedSize,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: data.hasNext ?? false,
        fetchKey,
        filters: { search: resolvedSearch, category: resolvedCategory },
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchArticleCategories = createAsyncThunk(
  'content/fetchArticleCategories',
  async (_, { getState, rejectWithValue }) => {
    const existing = getState().content.articles.categories;
    if (existing.length > 0) return existing;
    try {
      const response = await contentApi.getHealthArticleCategories();
      const data = response.data?.data || response.data;
      return data.categories || [];
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const fetchArticleById = createAsyncThunk(
  'content/fetchArticleById',
  async (articleId, { rejectWithValue }) => {
    try {
      const response = await contentApi.getHealthArticleById(articleId);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const createArticle = createAsyncThunk(
  'content/createArticle',
  async ({ data, imageFile }, { rejectWithValue }) => {
    try {
      const response = await contentApi.createHealthArticle(data, imageFile);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateArticle = createAsyncThunk(
  'content/updateArticle',
  async ({ articleId, data, imageFile }, { rejectWithValue }) => {
    try {
      const response = await contentApi.updateHealthArticle(articleId, data, imageFile);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const deleteArticle = createAsyncThunk(
  'content/deleteArticle',
  async (articleId, { rejectWithValue }) => {
    try {
      await contentApi.deleteHealthArticle(articleId);
      return articleId;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// ——— Advertisements ———

export const fetchAdvertisements = createAsyncThunk(
  'content/fetchAdvertisements',
  async ({ audience, force = false }, { getState, rejectWithValue }) => {
    try {
      const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
      const bucket = getState().content.advertisements[key];
      if (bucket.fetched && !force && !bucket.loading) {
        return { audience, cached: true };
      }

      const response = await contentApi.getAdvertisements(audience, 20);
      const data = response.data?.data || response.data;
      return {
        audience,
        items: data.items || [],
      };
    } catch (error) {
      return rejectWithValue({ audience, message: extractError(error) });
    }
  }
);

export const createAdvertisement = createAsyncThunk(
  'content/createAdvertisement',
  async ({ data, imageFile }, { rejectWithValue }) => {
    try {
      const response = await contentApi.createAdvertisement(data, imageFile);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateAdvertisement = createAsyncThunk(
  'content/updateAdvertisement',
  async ({ advertisementId, data, imageFile }, { rejectWithValue }) => {
    try {
      const response = await contentApi.updateAdvertisement(advertisementId, data, imageFile);
      return response.data?.data || response.data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const deleteAdvertisement = createAsyncThunk(
  'content/deleteAdvertisement',
  async (advertisementId, { rejectWithValue }) => {
    try {
      await contentApi.deleteAdvertisement(advertisementId);
      return advertisementId;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    setArticleFilters: (state, action) => {
      state.articles.filters = { ...state.articles.filters, ...action.payload };
      state.articles.fetchKey = null;
    },
    setArticlePage: (state, action) => {
      state.articles.page = action.payload;
      state.articles.fetchKey = null;
    },
    setAdAudience: (state, action) => {
      state.advertisements.audience = action.payload;
    },
    invalidateArticles: (state) => {
      state.articles.fetchKey = null;
    },
    invalidateAds: (state, action) => {
      const audiences = action.payload || ['PATIENT', 'DOCTOR'];
      audiences.forEach((aud) => {
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].fetched = false;
      });
    },
    clearContentErrors: (state) => {
      state.articles.error = null;
      state.advertisements.patient.error = null;
      state.advertisements.doctor.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Articles list
      .addCase(fetchArticles.pending, (state) => {
        if (!state.articles.loading) {
          state.articles.loading = true;
          state.articles.error = null;
        }
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        if (action.payload.cached) {
          state.articles.loading = false;
          return;
        }
        state.articles.loading = false;
        state.articles.items = action.payload.items;
        state.articles.page = action.payload.page;
        state.articles.size = action.payload.size;
        state.articles.totalElements = action.payload.totalElements;
        state.articles.totalPages = action.payload.totalPages;
        state.articles.hasNext = action.payload.hasNext;
        state.articles.fetchKey = action.payload.fetchKey;
        if (action.payload.filters) {
          state.articles.filters = action.payload.filters;
        }
      })
      .addCase(fetchArticles.rejected, (state, action) => {
        state.articles.loading = false;
        state.articles.error = action.payload;
      })
      // Categories
      .addCase(fetchArticleCategories.pending, (state) => {
        state.articles.categoriesLoading = true;
      })
      .addCase(fetchArticleCategories.fulfilled, (state, action) => {
        state.articles.categoriesLoading = false;
        state.articles.categories = action.payload;
      })
      .addCase(fetchArticleCategories.rejected, (state) => {
        state.articles.categoriesLoading = false;
      })
      // Article mutations
      .addCase(createArticle.pending, (state) => {
        state.articles.saving = true;
      })
      .addCase(createArticle.fulfilled, (state) => {
        state.articles.saving = false;
        state.articles.fetchKey = null;
      })
      .addCase(createArticle.rejected, (state) => {
        state.articles.saving = false;
      })
      .addCase(updateArticle.pending, (state) => {
        state.articles.saving = true;
      })
      .addCase(updateArticle.fulfilled, (state) => {
        state.articles.saving = false;
        state.articles.fetchKey = null;
      })
      .addCase(updateArticle.rejected, (state) => {
        state.articles.saving = false;
      })
      .addCase(deleteArticle.pending, (state) => {
        state.articles.saving = true;
      })
      .addCase(deleteArticle.fulfilled, (state, action) => {
        state.articles.saving = false;
        state.articles.items = state.articles.items.filter(
          (a) => a.articleId !== action.payload
        );
        state.articles.totalElements = Math.max(0, state.articles.totalElements - 1);
        state.articles.fetchKey = null;
      })
      .addCase(deleteArticle.rejected, (state) => {
        state.articles.saving = false;
      })
      // Ads list
      .addCase(fetchAdvertisements.pending, (state, action) => {
        const audience = action.meta.arg?.audience || state.advertisements.audience;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        if (!state.advertisements[key].loading) {
          state.advertisements[key].loading = true;
          state.advertisements[key].error = null;
        }
      })
      .addCase(fetchAdvertisements.fulfilled, (state, action) => {
        const { audience, items, cached } = action.payload;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].loading = false;
        if (!cached) {
          state.advertisements[key].items = items;
          state.advertisements[key].fetched = true;
        }
      })
      .addCase(fetchAdvertisements.rejected, (state, action) => {
        const audience = action.payload?.audience || 'PATIENT';
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].loading = false;
        state.advertisements[key].error = action.payload?.message || 'Failed to load ads';
      })
      // Ad mutations
      .addCase(createAdvertisement.pending, (state) => {
        state.advertisements.saving = true;
      })
      .addCase(createAdvertisement.fulfilled, (state, action) => {
        state.advertisements.saving = false;
        const aud = action.payload.audience || action.meta?.arg?.data?.audience;
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].fetched = false;
      })
      .addCase(createAdvertisement.rejected, (state) => {
        state.advertisements.saving = false;
      })
      .addCase(updateAdvertisement.pending, (state) => {
        state.advertisements.saving = true;
      })
      .addCase(updateAdvertisement.fulfilled, (state, action) => {
        state.advertisements.saving = false;
        const aud = action.payload.audience;
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].fetched = false;
      })
      .addCase(updateAdvertisement.rejected, (state) => {
        state.advertisements.saving = false;
      })
      .addCase(deleteAdvertisement.pending, (state) => {
        state.advertisements.saving = true;
      })
      .addCase(deleteAdvertisement.fulfilled, (state, action) => {
        state.advertisements.saving = false;
        ['patient', 'doctor'].forEach((key) => {
          state.advertisements[key].items = state.advertisements[key].items.filter(
            (ad) => ad.advertisementId !== action.payload
          );
          state.advertisements[key].fetched = false;
        });
      })
      .addCase(deleteAdvertisement.rejected, (state) => {
        state.advertisements.saving = false;
      });
  },
});

export const {
  setArticleFilters,
  setArticlePage,
  setAdAudience,
  invalidateArticles,
  invalidateAds,
  clearContentErrors,
} = contentSlice.actions;

export default contentSlice.reducer;
