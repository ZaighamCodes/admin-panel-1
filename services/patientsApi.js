import api from './api';

const PATIENT_ADMIN = '/patient/admin';
const FILE_ORIGIN = 'https://api.heydoctor.cloud';

export const unwrap = (response) => response.data?.data ?? response.data;

/** Encode + in mobile patientId as %2B */
export const encodePatientId = (patientId) => encodeURIComponent(String(patientId || '').trim());

export const decodePatientIdParam = (param) => {
  if (!param) return '';
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
};

/**
 * Allow only http(s) URLs. Relative paths are prefixed with API origin.
 * Blocks javascript:, data:, file: etc.
 */
export const resolveSafeFileUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${FILE_ORIGIN}${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed.href;
};

export const sanitizeDownloadName = (name, fallback = 'download') => {
  const raw = String(name || fallback).replace(/[/\\?%*:|"<>]/g, '_').trim();
  return raw.slice(0, 180) || fallback;
};

/**
 * GET /patient/admin/patients?page&size&q
 */
export const listAdminPatients = async (page = 0, size = 20, q = '') => {
  const safeSize = Math.min(Math.max(Number(size) || 20, 1), 50);
  const params = { page: Number(page) || 0, size: safeSize };
  const query = String(q || '').trim();
  if (query) params.q = query;
  return api.get(`${PATIENT_ADMIN}/patients`, { params });
};

/**
 * GET /patient/admin/patients/overview?patientId=
 * Single 360 call — do not also fetch details/documents/prescriptions.
 */
export const getAdminPatientOverview = async (patientId) => {
  const id = String(patientId || '').trim();
  if (!id) {
    return Promise.reject({ message: 'Patient ID is required', status: 400 });
  }
  return api.get(`${PATIENT_ADMIN}/patients/overview`, {
    params: { patientId: id },
  });
};
