import api from './api';

const CONTENT_PREFIX = '/content';

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

// ——— Advertisements ———

export const getAdvertisements = async (audience, limit = 20) => {
  const query = new URLSearchParams({
    audience,
    limit: String(Math.min(Math.max(limit, 1), 20)),
  });
  return api.get(`${CONTENT_PREFIX}/advertisements?${query.toString()}`);
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

// ——— Health Tips ———

export const getHealthTips = async (params = {}) => {
  const { audience = 'PATIENT', page = 0, size = 20, category } = params;
  const query = new URLSearchParams({
    audience,
    page: String(page),
    size: String(Math.min(Math.max(size, 1), 50)),
  });
  if (category) query.set('category', category);
  return api.get(`${CONTENT_PREFIX}/health-tips?${query.toString()}`);
};

export const createHealthTip = async (data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.post(`${CONTENT_PREFIX}/health-tips`, formData);
};

export const updateHealthTip = async (tipId, data, imageFile) => {
  const formData = buildMultipartBody(data, imageFile);
  return api.put(`${CONTENT_PREFIX}/health-tips/${tipId}`, formData);
};

export const deleteHealthTip = async (tipId) => {
  return api.delete(`${CONTENT_PREFIX}/health-tips/${tipId}`);
};
