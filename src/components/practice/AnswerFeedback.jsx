import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function AnswerFeedback({ feedback, onNext, isLast }) {
  const { t } = useTranslation();
  if (!feedback) return null;

  const { correct, correctAnswer, explanation } = feedback;

  return (
    <div className={`rounded-2xl border p-5 md:p-6 space-y-4 font-sans select-none animate-fade-in ${
      correct
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-rose-500/20 bg-rose-500/5'
    }`}>
      
      {/* Header status */}
      <div className="flex items-center gap-2.5">
        {correct ? (
          <>
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="text-sm md:text-base font-bold text-emerald-400">{t('practice.correctFeedback')} ✓</h4>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <h4 className="text-sm md:text-base font-bold text-rose-400">{t('practice.incorrectFeedback')}</h4>
          </>
        )}
      </div>

      {/* Correct answer text if wrong */}
      {!correct && (
        <div className="text-sm">
          <span className="text-muted">{t('practice.correctAnswer')}</span>
          <span className="font-semibold text-text ml-1.5">{correctAnswer}</span>
        </div>
      )}

      {/* Explanation text */}
      <div className="space-y-1.5 pl-0.5">
        <span className="text-xs font-bold text-muted uppercase tracking-wider">{t('practice.explanation')}</span>
        <p className="text-xs md:text-sm text-text leading-relaxed font-sans text-left">
          {explanation}
        </p>
      </div>

      {/* Next actions */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onNext}
          className={`inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-lg text-white transition-all shadow-md cursor-pointer ${
            correct
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
              : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
          }`}
        >
          {isLast ? t('practice.finishPractice') : t('practice.nextQuestion')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default AnswerFeedback;
