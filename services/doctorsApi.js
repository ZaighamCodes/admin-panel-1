import api from './api';

const ADMIN_PREFIX = '/doctor/admin';

export const unwrap = (response) => response.data?.data ?? response.data;

export const formatTalkTime = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * Get all pending verification doctors (ADMIN only)
 * @param {number} page - Page number (default: 0)
 * @param {number} size - Page size (default: 10)
 */
export const getPendingVerificationDoctors = async (page = 0, size = 10) => {
  const response = await api.get('/doctor/pending-verification', {
    params: { page, size },
  });
  return response;
};

/**
 * Get all verified doctors (ADMIN only)
 * Used by payment-requests / legacy flows. Prefer listAdminDoctors for /doctors UI.
 * @param {number} page - Page number (default: 0)
 * @param {number} size - Page size (default: 10)
 */
export const getAllVerifiedDoctors = async (page = 0, size = 10) => {
  const response = await api.get('/doctor/admin/all-verified', {
    params: { page, size },
  });
  return response;
};

/**
 * Approve/verify a doctor (ADMIN only)
 */
export const approveDoctor = async (doctorId) => {
  const response = await api.put(`/doctor/${doctorId}/approve`);
  return response;
};

/**
 * Reject doctor application (ADMIN only) - for unverified doctors
 */
export const rejectDoctorApplication = async (doctorId) => {
  const response = await api.put(`/doctor/${doctorId}/reject`);
  return response;
};

/**
 * Block verified doctor (ADMIN only) - unverifies only.
 * Do NOT use for bad-behavior deactivate — use setDoctorActive instead.
 */
export const blockDoctor = async (doctorId) => {
  const response = await api.put(`/doctor/${doctorId}/block`);
  return response;
};

/**
 * Get all rejected doctor applications (ADMIN only)
 * @param {number} page - Page number (default: 0)
 * @param {number} size - Page size (default: 10)
 */
export const getRejectedApplications = async (page = 0, size = 10) => {
  const response = await api.get('/doctor/rejected-applications', {
    params: { page, size },
  });
  return response;
};

/**
 * Admin doctor directory (paginated + search + filters)
 * GET /doctor/admin/doctors?page&size&q&verified&isActive
 */
export const listAdminDoctors = async ({
  page = 0,
  size = 20,
  q = '',
  verified,
  isActive,
} = {}) => {
  const safeSize = Math.min(Math.max(Number(size) || 20, 1), 100);
  const params = {
    page: Number(page) || 0,
    size: safeSize,
  };
  const query = String(q || '').trim();
  if (query) params.q = query;
  if (verified === true || verified === false) params.verified = verified;
  if (isActive === true || isActive === false) params.isActive = isActive;
  return api.get(`${ADMIN_PREFIX}/doctors`, { params });
};

/**
 * Doctor ops profile (stats + wallet + attended patients page)
 * GET /doctor/admin/doctors/{doctorId}/profile
 */
export const getAdminDoctorProfile = async (
  doctorId,
  { patientsPage = 0, patientsSize = 20 } = {}
) => {
  const id = Number(doctorId);
  if (!Number.isFinite(id) || id <= 0) {
    return Promise.reject({ message: 'Doctor ID is required', status: 400 });
  }
  const safeSize = Math.min(Math.max(Number(patientsSize) || 20, 1), 100);
  return api.get(`${ADMIN_PREFIX}/doctors/${id}/profile`, {
    params: {
      patientsPage: Number(patientsPage) || 0,
      patientsSize: safeSize,
    },
  });
};

/**
 * Paginate attended patients only (avoid full profile reload)
 * GET /doctor/admin/doctors/{doctorId}/attended-patients
 */
export const getAdminAttendedPatients = async (
  doctorId,
  { page = 0, size = 20 } = {}
) => {
  const id = Number(doctorId);
  if (!Number.isFinite(id) || id <= 0) {
    return Promise.reject({ message: 'Doctor ID is required', status: 400 });
  }
  const safeSize = Math.min(Math.max(Number(size) || 20, 1), 100);
  return api.get(`${ADMIN_PREFIX}/doctors/${id}/attended-patients`, {
    params: {
      page: Number(page) || 0,
      size: safeSize,
    },
  });
};

/**
 * Deactivate / reactivate doctor (bad-behavior ops)
 * PATCH /doctor/admin/doctors/{doctorId}/active
 * Body: { isActive: boolean, reason?: string }
 */
export const setDoctorActive = async (doctorId, { isActive, reason } = {}) => {
  const id = Number(doctorId);
  if (!Number.isFinite(id) || id <= 0) {
    return Promise.reject({ message: 'Doctor ID is required', status: 400 });
  }
  if (typeof isActive !== 'boolean') {
    return Promise.reject({ message: 'isActive is required', status: 400 });
  }
  const body = { isActive };
  const trimmed = String(reason || '').trim().slice(0, 500);
  if (trimmed) body.reason = trimmed;
  return api.patch(`${ADMIN_PREFIX}/doctors/${id}/active`, body);
};

/**
 * GET /doctor/admin/doctors/{doctorId}/pricing
 */
export const getDoctorPricing = async (doctorId) => {
  const id = Number(doctorId);
  if (!Number.isFinite(id) || id <= 0) {
    return Promise.reject({ message: 'Doctor ID is required', status: 400 });
  }
  return api.get(`${ADMIN_PREFIX}/doctors/${id}/pricing`);
};

/**
 * PATCH /doctor/admin/doctors/{doctorId}/pricing
 * Body examples:
 *   { consultationFeeInr: 149 }
 *   { consultationFeeInr: 149, earningInr: 60 }
 *   { clearConsultationFee: true }
 */
export const updateDoctorPricing = async (doctorId, body) => {
  const id = Number(doctorId);
  if (!Number.isFinite(id) || id <= 0) {
    return Promise.reject({ message: 'Doctor ID is required', status: 400 });
  }
  return api.patch(`${ADMIN_PREFIX}/doctors/${id}/pricing`, body || {});
};