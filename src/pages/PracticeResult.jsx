import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Award, Sparkles, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import practiceService from '../services/practice';

function PracticeResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

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
        setError('Failed to load practice result details.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center">
        <div className="text-center space-y-4 font-sans">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted">Calculating your practice result...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-md p-5 rounded-2xl border border-white/5 bg-[#111827]">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-text">This practice session is unavailable</h3>
          <p className="text-xs text-muted">{error || 'Session not found.'}</p>
          <Link to="/practice" className="inline-block px-4 py-2 text-xs font-semibold rounded bg-primary text-white hover:bg-primary-hover">
            Back to Practice
          </Link>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const total = session.totalQuestions;
  const correct = session.correctAnswers;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Filter incorrect questions
  const incorrectQuestions = session.questions.filter((q) => q.isAnswered && !q.isCorrect);

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
          Practice Setup
        </button>

        {/* Header Congratulate */}
        <div className="text-center py-6 select-none space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text">Practice Complete 🎉</h2>
          <p className="text-sm text-muted">
            {session.subject} • {session.topic}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider">Total Questions</p>
            <p className="text-xl font-bold mt-1">{total}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-emerald-400">Correct</p>
            <p className="text-xl font-bold mt-1 text-emerald-400">{correct}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-rose-400">Incorrect</p>
            <p className="text-xl font-bold mt-1 text-rose-400">{incorrect}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 text-center">
            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider text-indigo-400">Accuracy</p>
            <p className="text-xl font-bold mt-1 text-indigo-400">{accuracy}%</p>
          </div>
        </div>

        {/* Recommendations Action block */}
        <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 space-y-4">
          <h3 className="text-sm font-bold text-text">Recommended Next Steps</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
            <div className="space-y-1">
              {accuracy < 60 ? (
                <>
                  <p className="text-sm font-semibold text-rose-400">Review Recommended</p>
                  <p className="text-xs text-muted text-left">This topic could use a little more practice and mentor reviews.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-400">Great Work!</p>
                  <p className="text-xs text-muted text-left">You are showing strong recent practice. Try a harder set to test your skills!</p>
                </>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleReviewWithMentor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-white/5 border border-subtle hover:bg-white/10 text-muted hover:text-text transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Review with Mentor
              </button>
              <button
                onClick={handlePracticeAgain}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                {accuracy < 60 ? 'Practice Again' : 'Try a harder set'}
              </button>
            </div>
          </div>
        </div>

        {/* Incorrect answers review lists */}
        {incorrectQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider text-muted select-none">Review Your Mistakes</h3>
            
            <div className="space-y-3">
              {incorrectQuestions.map((q) => (
                <div key={q.id} className="rounded-2xl border border-white/5 bg-[#111827] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 capitalize">
                      {q.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted">Question {q.order}</span>
                  </div>
                  
                  <p className="text-sm font-semibold text-text text-left leading-relaxed">
                    {q.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                      <span className="text-muted block mb-0.5">Your answer:</span>
                      <span className="font-semibold text-rose-400">{q.studentAnswer || '(No answer)'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-muted block mb-0.5">Correct answer:</span>
                      <span className="font-semibold text-emerald-400">{q.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Explanation</span>
                    <p className="text-xs text-text leading-relaxed text-left font-sans">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <Link to="/practice" className="text-xs font-semibold text-muted hover:text-text transition-colors">
            Start a new session
          </Link>
          <Link to="/dashboard" className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-subtle text-muted hover:text-text transition-all">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PracticeResult;
