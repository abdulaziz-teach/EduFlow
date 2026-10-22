import { Router } from 'express';
import protect, { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';
import {
  getPlans,
  getSubscription,
  createCheckoutSession,
  cancelSubscription,
  resumeSubscription,
  getBillingHistory,
  handleWebhook,
  getAdminBillingStats,
  getAdminSubscriptions,
  getAdminPayments,
  processAdminRefund,
  reconcileBilling,
} from '../controllers/billingController.js';

const router = Router();

// Public / Signature-verified Webhook
router.post('/webhook', handleWebhook);

// Plan catalog (accessible to anyone)
router.get('/plans', optionalAuth, getPlans);

// User Subscription & Checkout (Protected)
router.get('/subscription', protect, getSubscription);
router.post('/checkout', protect, createCheckoutSession);
router.post('/cancel', protect, cancelSubscription);
router.post('/resume', protect, resumeSubscription);
router.get('/history', protect, getBillingHistory);

// Admin Management & Reconciliation (Admin Only)
router.get('/admin/stats', protect, requireAdmin, getAdminBillingStats);
router.get('/admin/subscriptions', protect, requireAdmin, getAdminSubscriptions);
router.get('/admin/payments', protect, requireAdmin, getAdminPayments);
router.post('/admin/refund', protect, requireAdmin, processAdminRefund);
router.post('/admin/reconcile', protect, requireAdmin, reconcileBilling);

export default router;
