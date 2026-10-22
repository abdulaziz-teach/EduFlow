import { Award, CalendarDays, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function PracticeHistory({ history }) {
  const { t, i18n } = useTranslation();
  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#111827] p-8 text-center font-sans select-none">
        <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
          <History className="w-6 h-6 text-muted/60" />
        </div>
        <h4 className="text-sm font-bold text-text mb-1">{t('practice.historyEmptyTitle')}</h4>
        <p className="text-xs text-muted">
          {t('practice.historyEmptyDescription')}
        </p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const locale = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' }[i18n.resolvedLanguage] || 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3 font-sans select-none">
      {history.map((session) => (
        <div
          key={session.id}
          className="rounded-xl border border-white/5 bg-[#111827]/60 hover:bg-[#111827] p-4 flex items-center justify-between gap-4 transition-all"
        >
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide truncate block">{session.subject}</span>
            <p className="text-sm font-semibold text-text truncate">{session.topic}</p>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5 shrink-0">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatDate(session.completedAt)}
              </span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">{t('practice.correctOfTotal', { correct: session.correct, total: session.total })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted leading-none">{t('practice.accuracy')}</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">{session.accuracy}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PracticeHistory;
