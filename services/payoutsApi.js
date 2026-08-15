import api from './api';

const ADMIN_PREFIX = '/doctor/admin';

const unwrap = (response) => response.data?.data ?? response.data;

/**
 * Pending withdrawal requests (manual payout queue)
 * GET /doctor/admin/payouts/pending
 */
export const getPendingPayouts = async (page = 0, size = 10) => {
  return api.get(`${ADMIN_PREFIX}/payouts/pending`, {
    params: { page, size },
  });
};

/**
 * Reveal full bank account number or UPI handle (admin only)
 * GET /doctor/admin/doctors/{doctorId}/payout-secret
 */
export const getPayoutSecret = async (doctorId) => {
  return api.get(`${ADMIN_PREFIX}/doctors/${doctorId}/payout-secret`);
};

/**
 * Mark withdrawal as PAID after manual bank/UPI transfer.
 * invoiceFile (optional PDF/JPG/PNG) is emailed to the doctor — not stored.
 * Response invoiceUrl is always null; do not display/download it.
 * POST /doctor/admin/payouts/{id}/mark-paid (multipart)
 */
export const markPayoutPaid = async (payoutId, { utr, note, invoiceFile } = {}) => {
  const formData = new FormData();
  if (utr) formData.append('utr', utr);
  if (note) formData.append('note', note);
  if (invoiceFile) formData.append('invoiceFile', invoiceFile);
  return api.post(`${ADMIN_PREFIX}/payouts/${payoutId}/mark-paid`, formData);
};

/**
 * Reject withdrawal → mark FAILED (wallet credit returned)
 * POST /doctor/admin/payouts/{id}/mark-failed
 */
export const markPayoutFailed = async (payoutId, reason) => {
  return api.post(`${ADMIN_PREFIX}/payouts/${payoutId}/mark-failed`, { reason });
};

/**
 * Doctor consultation fee + earning overrides
 * GET /doctor/admin/doctors/{doctorId}/pricing
 */
export const getDoctorPricing = async (doctorId) => {
  return api.get(`${ADMIN_PREFIX}/doctors/${doctorId}/pricing`);
};

/**
 * PATCH /doctor/admin/doctors/{doctorId}/pricing
 */
export const updateDoctorPricing = async (doctorId, body) => {
  return api.patch(`${ADMIN_PREFIX}/doctors/${doctorId}/pricing`, body);
};

/**
 * Patient consultation payments (all; client-filter by doctorId)
 * GET /doctor/admin/payments
 * TODO: GET /doctor/admin/payments?doctorId= when backend supports it
 */
export const getAdminPayments = async (page = 0, size = 20) => {
  return api.get(`${ADMIN_PREFIX}/payments`, {
    params: { page, size },
  });
};

export { unwrap };
