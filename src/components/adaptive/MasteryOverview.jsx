import { useState, useEffect } from 'react';
import { Brain, Info, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import adaptiveService from '../../services/adaptive';

export default function MasteryOverview() {
  const [masteries, setMasteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    adaptiveService
      .getMasteries()
      .then((res) => {
        if (res?.masteries) {
          setMasteries(res.masteries);
        }
      })
      .catch((err) => console.log('Mastery overview notice:', err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-white/5 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.02] rounded-xl border border-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (masteries.length === 0) {
    return null;
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'mastered':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'proficient':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'needs_review':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Topic Knowledge Mastery
        </h3>
        <span className="text-[11px] text-muted">Product-derived estimates</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {masteries.slice(0, 6).map((m) => {
          const scorePercent = Math.round((m.knowledgeScore || 0) * 100);
          return (
            <div
              key={m._id}
              onClick={() => setSelectedTopic(m)}
              className="p-3.5 rounded-xl bg-[#111827] border border-white/5 hover:border-white/10 transition-all cursor-pointer space-y-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text truncate group-hover:text-primary transition-colors">
                    {m.topic}
                  </p>
                  <span className="text-[10px] text-muted">{m.subject}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium border ${getStatusStyle(m.status)}`}>
                  {m.status.replace('_', ' ')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>Score</span>
                  <span className="font-semibold text-text">{scorePercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.status === 'mastered'
                        ? 'bg-emerald-500'
                        : m.status === 'proficient'
                        ? 'bg-indigo-500'
                        : m.status === 'needs_review'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-text text-sm">{selectedTopic.topic}</h4>
                <p className="text-xs text-muted">{selectedTopic.subject} • Status: <span className="capitalize">{selectedTopic.status.replace('_', ' ')}</span></p>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-muted hover:text-text text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-muted space-y-2">
              <p className="font-medium text-text">Estimate Explanation:</p>
              <p className="text-[11px] leading-relaxed">{selectedTopic.explanation}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-muted">Score</p>
                <p className="font-bold text-text">{Math.round(selectedTopic.knowledgeScore * 100)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-muted">Confidence</p>
                <p className="font-bold text-text">{Math.round(selectedTopic.confidence * 100)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-muted">Difficulty</p>
                <p className="font-bold text-primary capitalize">{selectedTopic.recommendedDifficulty}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTopic(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
