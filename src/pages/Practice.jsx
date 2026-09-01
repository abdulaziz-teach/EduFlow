import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Brain, Zap, History } from 'lucide-react';
import practiceService from '../services/practice';
import PracticeSetup from '../components/practice/PracticeSetup';
import PracticeProgress from '../components/practice/PracticeProgress';
import QuestionCard from '../components/practice/QuestionCard';
import AnswerFeedback from '../components/practice/AnswerFeedback';
import PracticeHistory from '../components/practice/PracticeHistory';

function Practice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSubject = searchParams.get('subject') || '';
  const preTopic = searchParams.get('topic') || '';

  // Setup / Active state toggler
  const [activeSession, setActiveSession] = useState(null); // sanitized session
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState(null);

  // Recommendations and History
  const [recommendation, setRecommendation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Global loading/error
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState('');

  const fetchMetadata = async () => {
    try {
      const [recRes, histRes] = await Promise.all([
        practiceService.getRecommendation(),
        practiceService.getHistory(),
      ]);
      setRecommendation(recRes.recommendation);
      setHistory(histRes.sessions);
    } catch (err) {
      console.error('Failed to load practice recommendations/history:', err.message);
    } finally {
      setLoadingMetadata(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleStartSession = async (config) => {
    setLoadingSession(true);
    setError('');
    try {
      const data = await practiceService.createSession(config);
      setActiveSession(data.session);
      setCurrentQuestionIndex(0);
      setAnswerFeedback(null);
    } catch (err) {
      setError(
        err.response?.data?.error === 'QUESTIONS_UNAVAILABLE'
          ? "We couldn't create practice questions right now. Please try again."
          : 'Failed to start practice session. Please try again.'
      );
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSubmitAnswer = async (studentAnswer) => {
    if (!activeSession) return;
    setSubmittingAnswer(true);
    setError('');

    const question = activeSession.questions[currentQuestionIndex];
    try {
      const feedback = await practiceService.submitAnswer(activeSession.id, {
        questionId: question.id,
        answer: studentAnswer,
      });
      setAnswerFeedback(feedback);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNext = async () => {
    const isLast = currentQuestionIndex === activeSession.questions.length - 1;
    if (isLast) {
      // Complete session
      setLoadingSession(true);
      try {
        await practiceService.completeSession(activeSession.id);
        navigate(`/practice/${activeSession.id}/result`);
      } catch (err) {
        setError('Failed to complete practice session cleanly. Redirecting to result page.');
        setTimeout(() => {
          navigate(`/practice/${activeSession.id}/result`);
        }, 1500);
      } finally {
        setLoadingSession(false);
      }
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setAnswerFeedback(null);
    }
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit this practice session? Your progress on this session will not be saved.')) {
      setActiveSession(null);
      setAnswerFeedback(null);
      fetchMetadata();
    }
  };

  if (loadingSession) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted">Building your practice set...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Back Link or Quit Button */}
        {activeSession ? (
          <button
            onClick={handleQuit}
            className="flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-300 transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Quit Practice
          </button>
        ) : (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        )}

        {/* Header Title */}
        <div className="mb-6 select-none">
          <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Smart Practice</h1>
          <p className="text-sm text-muted">
            {activeSession
              ? `${activeSession.subject} • ${activeSession.topic}`
              : 'Strengthen what you are learning with custom generated questions.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-400 select-none">
            {error}
          </div>
        )}

        {activeSession ? (
          /* Active Session View */
          <div className="space-y-6">
            <PracticeProgress
              current={currentQuestionIndex + 1}
              total={activeSession.questions.length}
            />

            <QuestionCard
              question={activeSession.questions[currentQuestionIndex]}
              currentNumber={currentQuestionIndex + 1}
              totalQuestions={activeSession.questions.length}
              submitting={submittingAnswer}
              onSubmit={handleSubmitAnswer}
              isAnswered={!!answerFeedback}
            />

            {answerFeedback && (
              <AnswerFeedback
                feedback={answerFeedback}
                onNext={handleNext}
                isLast={currentQuestionIndex === activeSession.questions.length - 1}
              />
            )}
          </div>
        ) : (
          /* Setup Selection and History screen */
          <div className="space-y-8">
            <PracticeSetup
              recommendation={recommendation}
              onStart={handleStartSession}
            />

            {/* Recent History Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider text-muted flex items-center gap-2 select-none">
                <History className="w-4 h-4" />
                Recent Practice History
              </h3>
              {loadingMetadata ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : (
                <PracticeHistory history={history} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Practice;
