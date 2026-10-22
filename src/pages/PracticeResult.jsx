import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Award, Sparkles, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import practiceService from '../services/practice';

function PracticeResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await practiceService.getSessionDetails(sessionId);
        setSession(data.session);
      } catch (err) {
        setError(t('practice.fetchError') || 'Failed to load practice result details.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [sessionId, t]);

  if (loading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center px-4">
        <div className="text-center space-y-4 font-sans">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted">{t('practice.calculating') || 'Calculating your practice result...'}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center px-4 font-sans">
        <div className="text-center space-y-4 max-w-md w-full p-5 sm:p-6 rounded-2xl border border-white/5 bg-[#111827]">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-text">{t('practice.unavailable') || 'This practice session is unavailable'}</h3>
          <p className="text-xs text-muted">{error || t('practice.notFound') || 'Session not found.'}</p>
          <Link to="/practice" className="inline-block px-4 py-2 text-xs font-semibold rounded bg-primary text-white hover:bg-primary-hover">
            {t('practice.backToPractice')}
          </Link>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const total = session.totalQuestions || (session.questions ? session.questions.length : 0);
  const correct = session.correctAnswers ?? session.score ?? 0;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Filter incorrect questions
  const incorrectQuestions = (session.questions || []).filter((q) => q.isCorrect === false);

  const handleReviewWithMentor = () => {
    navigate('/mentor', {
      state: {
        prefillMessage: `I struggled with ${session.topic}. Help me understand the mistakes and practice step by step.`,
        subject: session.subject,
        topic: session.topic,
      },
    });
  };

  const handlePracticeAgain = () => {
    navigate(`/practice?subject=${encodeURIComponent(session.subject)}&topic=${encodeURIComponent(session.topic)}`);
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/practice')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('practice.backToPractice')}
        </button>

        {/* Header Congratulate */}
        <div className="text-center py-4 sm:py-6 select-none space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text">{t('practice.practiceComplete') || 'Practice Complete 🎉'}</h2>
          <p className="text-sm text-muted break-words">
            {session.subject} • {session.topic}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 select-none">
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-3 sm:p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">{t('practice.totalQuestions') || 'Total Questions'}</p>
            <p className="text-xl font-bold mt-1">{total}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-3 sm:p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-emerald-400">{t('practice.correct') || 'Correct'}</p>
            <p className="text-xl font-bold mt-1 text-emerald-400">{correct}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-3 sm:p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-rose-400">{t('practice.incorrect') || 'Incorrect'}</p>
            <p className="text-xl font-bold mt-1 text-rose-400">{incorrect}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-3 sm:p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-indigo-400">{t('practice.accuracy') || 'Accuracy'}</p>
            <p className="text-xl font-bold mt-1 text-indigo-400">{accuracy}%</p>
          </div>
        </div>

        {/* Recommendations Action block */}
        <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-text">{t('practice.recommendedNextSteps') || 'Recommended Next Steps'}</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div className="space-y-1">
              {accuracy < 60 ? (
                <>
                  <p className="text-sm font-semibold text-rose-400">{t('practice.reviewRecommended') || 'Review Recommended'}</p>
                  <p className="text-xs text-muted text-left">{t('practice.reviewRecommendedDesc') || 'This topic could use a little more practice and mentor reviews.'}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-400">{t('practice.greatWork') || 'Great Work!'}</p>
                  <p className="text-xs text-muted text-left">{t('practice.greatWorkDesc') || 'You are showing strong recent practice. Try a harder set to test your skills!'}</p>
                </>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
              <button
                onClick={handleReviewWithMentor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-white/5 border border-subtle hover:bg-white/10 text-muted hover:text-text transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {t('practice.reviewWithMentor') || 'Review with Mentor'}
              </button>
              <button
                onClick={handlePracticeAgain}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                {accuracy < 60 ? (t('practice.retry') || 'Practice Again') : (t('practice.tryHarder') || 'Try a harder set')}
              </button>
            </div>
          </div>
        </div>

        {/* Incorrect answers review lists */}
        {incorrectQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider text-muted select-none">{t('practice.reviewMistakes') || 'Review Your Mistakes'}</h3>
            
            <div className="space-y-3">
              {incorrectQuestions.map((q) => (
                <div key={q.id} className="rounded-2xl border border-white/5 bg-[#111827] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 capitalize">
                      {q.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted">{t('practice.questionLabel') || 'Question'} {q.order}</span>
                  </div>
                  
                  <p className="text-sm font-semibold text-text text-left leading-relaxed break-words">
                    {q.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                      <span className="text-muted block mb-0.5">{t('practice.yourAnswer') || 'Your answer:'}</span>
                      <span className="font-semibold text-rose-400 break-words">{q.studentAnswer || '(No answer)'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-muted block mb-0.5">{t('practice.correctAnswer')}</span>
                      <span className="font-semibold text-emerald-400 break-words">{q.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{t('practice.explanation')}</span>
                    <p className="text-xs text-text leading-relaxed text-left font-sans break-words">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-white/5">
          <Link to="/practice" className="text-xs font-semibold text-muted hover:text-text transition-colors">
            {t('practice.startNewSession') || 'Start a new session'}
          </Link>
          <Link to="/dashboard" className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-subtle text-muted hover:text-text transition-all">
            {t('common.dashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PracticeResult;
