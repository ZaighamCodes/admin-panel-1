import api from './api';

const ADMIN_PREFIX = '/doctor/admin';

export const unwrap = (response) => {
  const body = response?.data;
  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    const err = new Error(body.message || 'Request failed');
    err.status = 400;
    err.data = body;
    throw err;
  }
  return body?.data ?? body;
};

export const formatInr = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
};

export const formatTalkTimeSeconds = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

/**
 * Admin home KPIs — single call
 * GET /doctor/admin/dashboard/overview?range=all
 */
export const getAdminDashboardOverview = async (range = 'all') => {
  return api.get(`${ADMIN_PREFIX}/dashboard/overview`, {
    params: { range: range || 'all' },
    headers: { Accept: 'application/json' },
  });
};
