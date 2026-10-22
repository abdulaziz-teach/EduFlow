import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Check,
  Zap,
  ArrowLeft,
  Loader2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import billingService from '../services/billing';

function Billing() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadBillingData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, subRes, historyRes] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
        billingService.getBillingHistory({ limit: 10 }),
      ]);

      setPlans(plansRes.data?.plans || plansRes.plans || []);
      setSubscription(subRes.data || subRes);
      setPayments(historyRes.data?.payments || historyRes.payments || []);
    } catch (err) {
      setError(t('billing.loadError') || 'Failed to load billing information. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleCheckout = async (planId) => {
    setActionLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const res = await billingService.createCheckout({
        planId,
        provider: 'mock',
        successUrl: window.location.origin + '/billing',
        cancelUrl: window.location.origin + '/billing',
      });

      const data = res.data || res;
      if (data.checkoutUrl) {
        // In mock mode, we simulate the webhook event confirmation
        setSuccessMessage(`Checkout session created for ${data.amount ? '$' + (data.amount / 100).toFixed(2) : planId}. Activating plan...`);
        // Refresh billing data after short delay
        setTimeout(() => {
          loadBillingData();
          setSuccessMessage(t('billing.activatedSuccess') || 'Subscription activated successfully! Welcome to Pro.');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('billing.checkoutError') || 'Failed to initiate checkout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('billing.confirmCancel') || 'Are you sure you want to cancel your subscription? You will keep access until the end of your billing cycle.')) {
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await billingService.cancelSubscription({ atPeriodEnd: true });
      setSuccessMessage(t('billing.cancelScheduled') || 'Your subscription has been scheduled to cancel at the end of the billing period.');
      loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || t('billing.cancelError') || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    setError('');
    try {
      await billingService.resumeSubscription();
      setSuccessMessage(t('billing.resumedSuccess') || 'Your subscription has been resumed!');
      loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || t('billing.resumeError') || 'Failed to resume subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (cents) => {
    if (cents === 0) return t('billing.free') || 'Free';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const localeMap = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
    return new Date(dateStr).toLocaleDateString(localeMap[i18n.language] || 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isCurrentPlan = (planId) => {
    if (!subscription) return planId === 'free';
    if (subscription.plan === planId) return true;
    if (subscription.plan === 'premium' && (planId === 'pro_monthly' || planId === 'premium')) return true;
    return false;
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-5xl mx-auto space-y-8 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.dashboard')}
          </button>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary shrink-0" />
            <span>{t('billing.title') || 'Billing & Subscriptions'}</span>
          </h1>
          <p className="text-xs md:text-sm text-muted mt-1">
            {t('billing.subtitle') || 'Manage your subscription plan, payment history, and premium learning entitlements.'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs md:text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Current Plan Overview Card */}
            <div className="p-4 sm:p-6 rounded-2xl border border-white/10 bg-[#111827] shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      {t('billing.currentPlan') || 'Current Plan'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        subscription?.isPremium
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : 'bg-white/5 text-muted border-white/10'
                      }`}
                    >
                      {subscription?.status || 'Active'}
                    </span>
                    {subscription?.cancelAtPeriodEnd && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {t('billing.cancelsAtPeriodEnd') || 'Cancels at period end'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-text">
                    {subscription?.planName || 'EduFlow Basic'}
                  </h3>
                  <p className="text-xs text-muted flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-muted/60" />
                    {subscription?.isPremium
                      ? `${t('billing.renewsExpiresOn') || 'Renews/Expires on:'} ${formatDate(subscription.currentPeriodEnd)}`
                      : (t('billing.freeTierDesc') || 'Free tier with foundational access')}
                  </p>
                </div>

                {/* Subscription Actions */}
                {subscription?.isPremium && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {subscription.cancelAtPeriodEnd ? (
                      <button
                        disabled={actionLoading}
                        onClick={handleResume}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t('billing.resumeSubscription') || 'Resume Subscription'}
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading}
                        onClick={handleCancel}
                        className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-muted hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {t('billing.cancelSubscription') || 'Cancel Subscription'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Plans Comparison Grid */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-text flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{t('billing.plansTitle') || 'Subscription Plans'}</span>
                </h2>
                <p className="text-xs text-muted">
                  {t('billing.plansSubtitle') || 'Choose the plan that fits your learning journey. Upgrade, downgrade, or cancel anytime.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {plans.map((p) => {
                  const isCurrent = isCurrentPlan(p.id);
                  const isPopular = p.id === 'pro_annual';

                  return (
                    <div
                      key={p.id}
                      className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between relative transition-all ${
                        isPopular
                          ? 'border-primary/40 bg-gradient-to-b from-primary/[0.06] to-[#111827] shadow-xl'
                          : 'border-white/10 bg-[#111827] hover:border-white/20'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wide border border-primary-hover shadow-sm">
                          {t('billing.bestValue') || 'Best Value · Save 31%'}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-bold text-text">{p.name}</h4>
                          <p className="text-xs text-muted mt-1 leading-relaxed">{p.description}</p>
                        </div>

                        <div className="flex items-baseline gap-1 border-b border-white/5 pb-4">
                          <span className="text-3xl font-extrabold text-text">
                            {formatPrice(p.price)}
                          </span>
                          {p.price > 0 && (
                            <span className="text-xs text-muted">/{p.interval}</span>
                          )}
                        </div>

                        {/* Features checklist */}
                        <ul className="space-y-2.5">
                          {p.features?.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-text/90">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA Button */}
                      <div className="pt-6">
                        {isCurrent ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-muted font-bold text-xs cursor-default"
                          >
                            {t('billing.currentPlan') || 'Current Plan'}
                          </button>
                        ) : p.price === 0 ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-muted font-bold text-xs cursor-default"
                          >
                            {t('billing.includedByDefault') || 'Included by Default'}
                          </button>
                        ) : (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleCheckout(p.id)}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                              isPopular
                                ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                                : 'bg-white/10 text-text hover:bg-white/20'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {actionLoading ? t('common.loading') : `${t('billing.upgradeTo') || 'Upgrade to'} ${p.name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Billing & Payment History */}
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="text-base md:text-lg font-bold text-text">{t('billing.paymentHistory') || 'Payment History'}</h3>
                <p className="text-xs text-muted">{t('billing.paymentHistorySubtitle') || 'Review your past invoices and transactions.'}</p>
              </div>

              {payments.length === 0 ? (
                <div className="p-8 rounded-2xl border border-white/5 bg-[#111827] text-center">
                  <p className="text-xs text-muted">{t('billing.noTransactions') || 'No past billing transactions found.'}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="border-b border-white/5 bg-white/[0.02] text-muted">
                        <tr>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Plan / Product</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {payments.map((pmt) => (
                          <tr key={pmt._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3.5 text-muted">{formatDate(pmt.createdAt)}</td>
                            <td className="p-3.5 font-semibold text-text capitalize">
                              {pmt.planId ? pmt.planId.replace('_', ' ') : 'Subscription'}
                            </td>
                            <td className="p-3.5 text-text font-bold">
                              ${(pmt.amount / 100).toFixed(2)} {pmt.currency}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  pmt.status === 'succeeded'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : pmt.status === 'refunded'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : pmt.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {pmt.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <span className="text-[11px] text-muted flex items-center justify-end gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Billing;
