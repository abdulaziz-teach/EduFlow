import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, BookOpen, Layers, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import adaptiveService from '../../services/adaptive';

export default function NextActionCard({ onActionComplete }) {
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = ['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz';

  const fetchAction = async () => {
    try {
      const res = await adaptiveService.getNextAction();
      if (res?.action) {
        setAction(res.action);
      }
    } catch (err) {
      console.warn('Next Best Action fallback active:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAction();
  }, []);

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-[#111827] border border-white/5 animate-pulse space-y-3">
        <div className="h-4 bg-white/10 rounded w-1/3" />
        <div className="h-6 bg-white/10 rounded w-2/3" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
      </div>
    );
  }

  if (!action) return null;

  const handleExecute = () => {
    if (action.actionPayload?.route) {
      navigate(action.actionPayload.route);
    } else {
      navigate('/study-plan');
    }
    if (onActionComplete) onActionComplete();
  };

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'hard':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            {currentLang === 'uz' ? 'Murakkab' : currentLang === 'ru' ? 'Сложный' : 'Challenging'}
          </span>
        );
      case 'easy':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            {currentLang === 'uz' ? 'Boshlang‘ich' : currentLang === 'ru' ? 'Базовый' : 'Foundational'}
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            {currentLang === 'uz' ? 'Muvozanatli' : currentLang === 'ru' ? 'Сбалансированный' : 'Balanced'}
          </span>
        );
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'review_flashcards':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'study_prerequisite':
        return <AlertTriangle className="w-5 h-5 text-amber-300" />;
      case 'practice_weak_topic':
        return <RotateCcw className="w-5 h-5 text-rose-400" />;
      case 'continue_lesson':
        return <BookOpen className="w-5 h-5 text-primary" />;
      default:
        return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  // Honest truth-in-labeling: clarifies live AI engine vs offline/local recommendation
  const badgeLabel = action.isFallback
    ? t('dashboard.nextAction.demoBadge', {
        defaultValue:
          currentLang === 'uz'
            ? '⚡ Demo Tavsiya (Offline)'
            : currentLang === 'ru'
            ? '⚡ Демо-режим (Офлайн)'
            : '⚡ Demo Mode (Offline)',
      })
    : t('dashboard.nextAction.liveBadge', {
        defaultValue: 'Adaptive Intelligence • Next Best Action',
      });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111827] to-[#161f33] border border-primary/20 p-5 md:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            {getIcon(action.type)}
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
              {badgeLabel}
            </span>
            <h3 className="text-base md:text-lg font-bold text-text">{action.title}</h3>
          </div>
        </div>
        {getDifficultyBadge(action.recommendedDifficulty)}
      </div>

      <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
        {action.subtitle}
      </p>

      {/* Rationale callout */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>{action.reason}</span>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={handleExecute}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer"
        >
          {action.ctaText || (currentLang === 'uz' ? 'Davom etish' : currentLang === 'ru' ? 'Продолжить' : 'Continue')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
