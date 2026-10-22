import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import studyPlanService from '../../services/studyPlan';

function AdaptationModal({ isOpen, onClose, planId, onAdapted }) {
  const { t, i18n } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { type, reason, changes, explanation }
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError('');
      setExplanation('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const data = await studyPlanService.adaptStudyPlan(planId);
      
      if (data.alreadyAdaptedToday) {
        setError(t('studyPlan.alreadyAdaptedToday') || 'Your study plan was already adapted today. Please try again tomorrow to avoid excessive scheduling changes.');
        setSubmitting(false);
        return;
      }

      const adaptData = data.adaptation;
      setResult(adaptData);

      // If there are changes, request an AI explanation
      if (adaptData.changes && adaptData.changes.length > 0) {
        setLoadingExplanation(true);
        try {
          const expRes = await studyPlanService.getAdaptationExplanation(
            adaptData.type,
            adaptData.reason,
            adaptData.changes
          );
          setExplanation(expRes.explanation);
        } catch {
          // fallback inline explanation
          setExplanation(`We reorganized your plan to fit outstanding tasks within your capacity.`);
        } finally {
          setLoadingExplanation(false);
        }
      }

      if (onAdapted) {
        onAdapted(adaptData);
      }
    } catch (err) {
      setError(err.message || 'We couldn\'t update your plan right now. Your existing plan has not been changed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const localeMap = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
    return new Date(dateStr).toLocaleDateString(localeMap[i18n.language] || 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 text-text shadow-2xl select-none">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!result ? (
          /* State 1: Request Adaptation Confirmation */
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-text mb-2">{t('studyPlan.adaptTitle') || 'Adjust your study plan?'}</h3>
              <p className="text-sm text-muted leading-relaxed">
                {t('studyPlan.adaptSubtitle') || "EduFlow found that your recent progress doesn't perfectly match the current schedule."}
              </p>
              <p className="text-sm text-muted leading-relaxed mt-2">
                {t('studyPlan.adaptDescription') || "We can reorganize future tasks while keeping your completed progress unchanged."}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-subtle text-muted hover:bg-white/10 hover:text-text transition-all cursor-pointer disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('studyPlan.adaptNow') || 'Adjust plan'}
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Adaptation Success & Explanations review */
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-text">{t('studyPlan.planAdapted') || 'Plan updated ✓'}</h3>
            </div>

            {result.changes.length === 0 ? (
              <p className="text-sm text-muted">
                {t('studyPlan.noChanges') || 'Your plan is already on track. No changes were necessary.'}
              </p>
            ) : (
              <div className="space-y-4">
                {/* AI Explanation bubble */}
                {(loadingExplanation || explanation) && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1 select-none">{t('mentor.title') || 'AI Coach Advice'}</p>
                    {loadingExplanation ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <p className="text-sm text-text italic font-medium leading-relaxed">
                        &ldquo;{explanation}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Rescheduling Changes breakdown */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t('studyPlan.reorganizedTasks') || 'Reorganized Tasks'} ({result.changes.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1 border border-subtle/40 rounded-xl bg-white/[0.01] p-3">
                    {result.changes.map((ch, idx) => (
                      <div key={idx} className="text-xs flex flex-col justify-between py-1 border-b border-white/[0.02] last:border-0 last:pb-0">
                        <span className="font-semibold text-text truncate">{t('studyPlan.rescheduledTask') || 'Rescheduled Task'}</span>
                        <span className="text-muted mt-0.5">
                          {formatDate(ch.fromDate)} &rarr; {formatDate(ch.toDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-subtle text-muted hover:bg-white/10 hover:text-text transition-all cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdaptationModal;
