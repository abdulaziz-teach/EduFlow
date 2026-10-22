import api from './api';

export const getPlans = () => api.get('/billing/plans');
export const getSubscription = () => api.get('/billing/subscription');
export const createCheckout = (data) => api.post('/billing/checkout', data);
export const cancelSubscription = (data = { atPeriodEnd: true }) => api.post('/billing/cancel', data);
export const resumeSubscription = () => api.post('/billing/resume');
export const getBillingHistory = (params = {}) => api.get('/billing/history', { params });

// Admin endpoints
export const getAdminBillingStats = () => api.get('/billing/admin/stats');
export const getAdminSubscriptions = (params = {}) => api.get('/billing/admin/subscriptions', { params });
export const getAdminPayments = (params = {}) => api.get('/billing/admin/payments', { params });
export const processAdminRefund = (data) => api.post('/billing/admin/refund', data);
export const reconcileBilling = () => api.post('/billing/admin/reconcile');

const billingService = {
  getPlans,
  getSubscription,
  createCheckout,
  cancelSubscription,
  resumeSubscription,
  getBillingHistory,
  getAdminBillingStats,
  getAdminSubscriptions,
  getAdminPayments,
  processAdminRefund,
  reconcileBilling,
};

export default billingService;
