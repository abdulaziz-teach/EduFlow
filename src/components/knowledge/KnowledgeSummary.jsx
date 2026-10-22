import { BookOpen, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function KnowledgeSummary({ summary }) {
  const { t } = useTranslation();
  if (!summary) return null;

  const cards = [
    {
      label: t('knowledge.totalTopics'),
      value: summary.totalTopics || 0,
      icon: BookOpen,
      color: 'text-indigo-400 bg-indigo-500/10',
    },
    {
      label: t('knowledge.learning'),
      value: summary.learningTopics || 0,
      icon: TrendingUp,
      color: 'text-sky-400 bg-sky-500/10',
    },
    {
      label: t('knowledge.needsReviewTopics'),
      value: summary.needsReview || 0,
      icon: AlertCircle,
      color: 'text-rose-400 bg-rose-500/10',
    },
    {
      label: t('knowledge.strongTopics'),
      value: summary.strongTopics || 0,
      icon: Sparkles,
      color: 'text-emerald-400 bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-sans select-none">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{card.label}</p>
              <p className="text-xl font-bold mt-0.5 text-text">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KnowledgeSummary;
