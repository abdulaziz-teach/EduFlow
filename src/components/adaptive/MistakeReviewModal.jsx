import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, X, Loader2 } from 'lucide-react';
import adaptiveService from '../../services/adaptive';

export default function MistakeReviewModal({ isOpen, onClose }) {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchMistakes = async () => {
    setLoading(true);
    try {
      const res = await adaptiveService.getMistakes();
      if (res?.mistakes) {
        setMistakes(res.mistakes);
      }
    } catch (err) {
      console.error('Failed to fetch mistakes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMistakes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await adaptiveService.resolveMistake(id);
      setMistakes((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error('Failed to resolve mistake:', err.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-text text-sm">Mistake Review & Remediation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted">Loading review log...</p>
            </div>
          ) : mistakes.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-text">No Unresolved Mistakes!</p>
              <p className="text-xs text-muted">You have reviewed and mastered all previous errors.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Review missed questions to understand the underlying principles before retrying.
              </p>

              {mistakes.map((m) => (
                <div
                  key={m._id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span className="font-semibold text-primary">{m.topic}</span>
                    <span>Missed {m.attemptsCount} time(s)</span>
                  </div>

                  <p className="font-medium text-text">{m.question}</p>

                  <div className="space-y-1 text-[11px]">
                    {m.userAnswer && (
                      <p className="text-rose-400">Your answer: {m.userAnswer}</p>
                    )}
                    <p className="text-emerald-400 font-medium">Correct answer: {m.correctAnswer}</p>
                  </div>

                  {m.explanation && (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-muted text-[11px]">
                      {m.explanation}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleResolve(m._id)}
                      disabled={resolvingId === m._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium transition-all cursor-pointer"
                    >
                      {resolvingId === m._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Mark as Understood
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-[#0B0F19] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
