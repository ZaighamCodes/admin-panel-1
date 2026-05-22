import api from './api';

const CONTENT_PREFIX = '/api/v1/content';

const buildMultipartBody = (data, imageFile) => {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify(data)], { type: 'application/json' })
  );
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return formData;
};

const unwrapData = (response) => response.data?.data ?? response.data;

// ——— Advertisements (admin) ———

/** Admin list — all ads including inactive (uncached) */
export const getAdvertisementsManage = async (audience) => {
  return api.get(`${CONTENT_PREFIX}/advertisements/manage`, {
    params: { audience },
  });
};

export const createAdvertisement = async (data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.post(`${CONTENT_PREFIX}/advertisements`, formData);
};

export const updateAdvertisement = async (advertisementId, data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.put(`${CONTENT_PREFIX}/advertisements/${advertisementId}`, formData);
};

export const deleteAdvertisement = async (advertisementId) => {
  return api.delete(`${CONTENT_PREFIX}/advertisements/${advertisementId}`);
};

// ——— Health Tips (admin — text only, JSON body) ———

/** Admin list — all tips including inactive (uncached) */
export const getHealthTipsManage = async (audience) => {
  return api.get(`${CONTENT_PREFIX}/health-tips/manage`, {
    params: { audience },
  });
};

export const createHealthTip = async (data) => {
  return api.post(`${CONTENT_PREFIX}/health-tips`, data);
};

export const updateHealthTip = async (tipId, data) => {
  return api.put(`${CONTENT_PREFIX}/health-tips/${tipId}`, data);
};

export const deleteHealthTip = async (tipId) => {
  return api.delete(`${CONTENT_PREFIX}/health-tips/${tipId}`);
};

// ——— Health Articles ———

export const getHealthArticles = async (params = {}) => {
  const { page = 0, size = 20, category, featured, search } = params;
  const query = { page: String(page), size: String(Math.min(Math.max(size, 1), 50)) };
  if (category) query.category = category;
  if (featured !== undefined && featured !== null && featured !== '') {
    query.featured = String(featured);
  }
  if (search) query.search = search;
  return api.get(`${CONTENT_PREFIX}/health-articles`, { params: query });
};

export const getHealthArticleCategories = async () => {
  return api.get(`${CONTENT_PREFIX}/health-articles/categories`);
};

export const getHealthArticleById = async (articleId) => {
  return api.get(`${CONTENT_PREFIX}/health-articles/${articleId}`);
};

export const createHealthArticle = async (data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.post(`${CONTENT_PREFIX}/health-articles`, formData);
};

export const updateHealthArticle = async (articleId, data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.put(`${CONTENT_PREFIX}/health-articles/${articleId}`, formData);
};

export const deleteHealthArticle = async (articleId) => {
  return api.delete(`${CONTENT_PREFIX}/health-articles/${articleId}`);
};

export { unwrapData };
