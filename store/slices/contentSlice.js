import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as contentApi from '@/services/contentApi';

const extractError = (error) =>
  error?.message || error?.data?.message || 'Something went wrong';

const parseTipsManage = (response) => {
  const data = contentApi.unwrapData(response);
  return Array.isArray(data) ? data : [];
};

const initialState = {
  healthTips: {
    audience: 'PATIENT',
    patient: { items: [], loading: false, error: null, fetched: false },
    doctor: { items: [], loading: false, error: null, fetched: false },
    saving: false,
  },
  advertisements: {
    audience: 'PATIENT',
    patient: { items: [], loading: false, error: null, fetched: false },
    doctor: { items: [], loading: false, error: null, fetched: false },
    saving: false,
  },
  articles: {
    items: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    loading: false,
    saving: false,
    detailLoading: false,
    error: null,
    categories: [],
    categoriesLoading: false,
    filters: { search: '', category: '', featured: '' },
    fetchKey: null,
  },
};

// ——— Health Tips ———

export const fetchHealthTips = createAsyncThunk(
  'content/fetchHealthTips',
  async ({ audience, force = false }, { getState, rejectWithValue }) => {
    try {
      const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
      const bucket = getState().content.healthTips[key];
      if (bucket.fetched && !force && !bucket.loading) {
        return { audience, cached: true };
      }

      const response = await contentApi.getHealthTipsManage(audience);
      return { audience, items: parseTipsManage(response) };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const createHealthTip = createAsyncThunk(
  'content/createHealthTip',
  async ({ data }, { rejectWithValue }) => {
    try {
      const response = await contentApi.createHealthTip(data);
      return contentApi.unwrapData(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const updateHealthTip = createAsyncThunk(
  'content/updateHealthTip',
  async ({ tipId, data }, { rejectWithValue }) => {
    try {
      const response = await contentApi.updateHealthTip(tipId, data);
      return contentApi.unwrapData(response);
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const deleteHealthTip = createAsyncThunk(
  'content/deleteHealthTip',
  async (tipId, { rejectWithValue }) => {
    try {
      await contentApi.deleteHealthTip(tipId);
      return tipId;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// ——— Health Articles ———

export const fetchArticles = createAsyncThunk(
  'content/fetchArticles',
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState().content.articles;
      const page = params?.page ?? state.page;
      const size = params?.size ?? state.size;
      const search = params?.search !== undefined ? params.search : state.filters.search;
      const category = params?.category !== undefined ? params.category : state.filters.category;
      const featured =
        params?.featured !== undefined ? params.featured : state.filters.featured;

      const fetchKey = `${page}|${size}|${search}|${category}|${featured}`;
      if (state.fetchKey === fetchKey && state.items.length > 0 && !params?.force) {
        return { cached: true, fetchKey };
      }

      const response = await contentApi.getHealthArticles({
        page,
        size,
        search: search || undefined,
        category: category || undefined,
        featured: featured === '' ? undefined : featured === 'true',
      });
      const data = contentApi.unwrapData(response);
      return {
        items: data.content || [],
        page: data.page ?? page,
        size: data.size ?? size,
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        hasNext: data.hasNext ?? false,
        fetchKey,
        filters: { search, category, featured },
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
      const data = contentApi.unwrapData(response);
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
      return contentApi.unwrapData(response);
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
      return contentApi.unwrapData(response);
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
      return contentApi.unwrapData(response);
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

      const response = await contentApi.getAdvertisementsManage(audience);
      const data = contentApi.unwrapData(response);
      return { audience, items: data?.items || [] };
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
      return contentApi.unwrapData(response);
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
      return contentApi.unwrapData(response);
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
    setTipAudience: (state, action) => {
      state.healthTips.audience = action.payload;
    },
    setAdAudience: (state, action) => {
      state.advertisements.audience = action.payload;
    },
    setArticleFilters: (state, action) => {
      state.articles.filters = { ...state.articles.filters, ...action.payload };
      state.articles.fetchKey = null;
    },
    setArticlePage: (state, action) => {
      state.articles.page = action.payload;
      state.articles.fetchKey = null;
    },
    invalidateArticles: (state) => {
      state.articles.fetchKey = null;
    },
    invalidateTips: (state, action) => {
      const audiences = action.payload || ['PATIENT', 'DOCTOR'];
      audiences.forEach((aud) => {
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.healthTips[key].fetched = false;
      });
    },
    invalidateAds: (state, action) => {
      const audiences = action.payload || ['PATIENT', 'DOCTOR'];
      audiences.forEach((aud) => {
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].fetched = false;
      });
    },
    clearContentErrors: (state) => {
      state.healthTips.patient.error = null;
      state.healthTips.doctor.error = null;
      state.advertisements.patient.error = null;
      state.advertisements.doctor.error = null;
      state.articles.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Health tips list
      .addCase(fetchHealthTips.pending, (state, action) => {
        const audience = action.meta.arg?.audience || state.healthTips.audience;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.healthTips[key].loading = true;
        state.healthTips[key].error = null;
      })
      .addCase(fetchHealthTips.fulfilled, (state, action) => {
        const { audience, items, cached } = action.payload;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.healthTips[key].loading = false;
        if (!cached) {
          state.healthTips[key].items = items;
          state.healthTips[key].fetched = true;
        }
      })
      .addCase(fetchHealthTips.rejected, (state, action) => {
        const audience = action.meta.arg?.audience || state.healthTips.audience;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.healthTips[key].loading = false;
        state.healthTips[key].error = action.payload;
      })
      .addCase(createHealthTip.pending, (state) => {
        state.healthTips.saving = true;
      })
      .addCase(createHealthTip.fulfilled, (state, action) => {
        state.healthTips.saving = false;
        const aud = action.meta?.arg?.data?.audience;
        const key = aud === 'DOCTOR' ? 'doctor' : 'patient';
        state.healthTips[key].fetched = false;
      })
      .addCase(createHealthTip.rejected, (state) => {
        state.healthTips.saving = false;
      })
      .addCase(updateHealthTip.pending, (state) => {
        state.healthTips.saving = true;
      })
      .addCase(updateHealthTip.fulfilled, (state) => {
        state.healthTips.saving = false;
        ['patient', 'doctor'].forEach((key) => {
          state.healthTips[key].fetched = false;
        });
      })
      .addCase(updateHealthTip.rejected, (state) => {
        state.healthTips.saving = false;
      })
      .addCase(deleteHealthTip.pending, (state) => {
        state.healthTips.saving = true;
      })
      .addCase(deleteHealthTip.fulfilled, (state, action) => {
        state.healthTips.saving = false;
        ['patient', 'doctor'].forEach((key) => {
          state.healthTips[key].items = state.healthTips[key].items.filter(
            (t) => t.tipId !== action.payload
          );
          state.healthTips[key].fetched = false;
        });
      })
      .addCase(deleteHealthTip.rejected, (state) => {
        state.healthTips.saving = false;
      })
      // Ads list
      .addCase(fetchAdvertisements.pending, (state, action) => {
        const audience = action.meta.arg?.audience || state.advertisements.audience;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].loading = true;
        state.advertisements[key].error = null;
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
        const audience = action.payload?.audience || state.advertisements.audience;
        const key = audience === 'DOCTOR' ? 'doctor' : 'patient';
        state.advertisements[key].loading = false;
        state.advertisements[key].error = action.payload?.message || 'Failed to load ads';
      })
      .addCase(createAdvertisement.pending, (state) => {
        state.advertisements.saving = true;
      })
      .addCase(createAdvertisement.fulfilled, (state, action) => {
        state.advertisements.saving = false;
        const aud = action.payload?.audience || action.meta?.arg?.data?.audience;
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
        const aud = action.payload?.audience;
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
      })
      // Articles list
      .addCase(fetchArticles.pending, (state) => {
        state.articles.loading = true;
        state.articles.error = null;
      })
      .addCase(fetchArticles.fulfilled, (state, action) => {
        state.articles.loading = false;
        if (action.payload.cached) return;
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
      .addCase(fetchArticleById.pending, (state) => {
        state.articles.detailLoading = true;
      })
      .addCase(fetchArticleById.fulfilled, (state) => {
        state.articles.detailLoading = false;
      })
      .addCase(fetchArticleById.rejected, (state) => {
        state.articles.detailLoading = false;
      })
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
      });
  },
});

export const {
  setTipAudience,
  setAdAudience,
  setArticleFilters,
  setArticlePage,
  invalidateArticles,
  invalidateTips,
  invalidateAds,
  clearContentErrors,
} = contentSlice.actions;

export default contentSlice.reducer;
