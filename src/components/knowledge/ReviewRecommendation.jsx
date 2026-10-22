import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, MessageSquare, Sparkles } from 'lucide-react';

function ReviewRecommendation({ recommendations }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleReviewClick = (rec) => {
    navigate('/mentor', {
      state: {
        prefillMessage: `Help me review ${rec.topic}. I want to practice the topic step by step.`,
        subject: rec.subject,
        topic: rec.topic,
      },
    });
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 text-center font-sans select-none">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <h4 className="text-sm font-semibold text-text mb-1">{t('knowledge.noReviewNeeded')}</h4>
        <p className="text-xs text-muted">{t('knowledge.noReviewNeeded')}</p>
      </div>
    );
  }

  // Show the primary (first) recommendation
  const primaryRec = recommendations[0];

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 font-sans select-none space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">{t('knowledge.reviewRecommended')}</span>
          <h4 className="text-base font-bold text-text mt-0.5">{primaryRec.topic}</h4>
          <span className="text-xs text-muted block mt-0.5">{primaryRec.subject}</span>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed pl-1 text-left">
        {primaryRec.reason}
      </p>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => handleReviewClick(primaryRec)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/15 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {t('knowledge.practiceNow')}
        </button>
      </div>
    </div>
  );
}

export default ReviewRecommendation;
