import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, Award, Clock, Activity, Zap } from 'lucide-react';

const STATUS_LABELS = {
  new: { text: 'New', color: 'text-muted border-muted/20 bg-muted/5' },
  learning: { text: 'Learning', color: 'text-sky-400 border-sky-500/20 bg-sky-500/5' },
  needs_review: { text: 'Needs review', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' },
  strong: { text: 'Strong', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
};

function TopicCard({ topic, isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !topic) return null;

  const statusObj = STATUS_LABELS[topic.status] || STATUS_LABELS.new;

  const handleReviewClick = () => {
    navigate('/mentor', {
      state: {
        prefillMessage: `Help me review ${topic.topic}. I want to practice the topic step by step.`,
        subject: topic.subject,
        topic: topic.topic,
      },
    });
  };

  const getReviewAdvice = () => {
    if (topic.status === 'needs_review') {
      return "You've practiced this topic several times, but recent activity suggests more practice could be useful.";
    }
    if (topic.status === 'strong') {
      return 'Excellent progress! Your recent practice shows high confidence. Review this periodically to lock it in.';
    }
    if (topic.status === 'learning') {
      return 'You are currently building understanding here. More practice sessions will boost your confidence.';
    }
    return 'Start your first study session or review with your mentor to begin learning this topic.';
  };

  const formatLastPracticed = (dateStr) => {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-md rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 text-text shadow-2xl select-none">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-5">
          {/* Header Title */}
          <div>
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{topic.subject}</span>
            <h3 className="text-lg font-bold text-text mt-1">{topic.topic}</h3>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase font-semibold">Confidence</p>
                <p className="text-sm font-bold text-text">{topic.confidence}%</p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase font-semibold">Practice Count</p>
                <p className="text-sm font-bold text-text">{topic.practiceCount} times</p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase font-semibold">Last Practiced</p>
                <p className="text-sm font-bold text-text truncate max-w-[120px]">
                  {formatLastPracticed(topic.lastPracticedAt)}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center gap-2">
              <Award className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted uppercase font-semibold">Status</p>
                <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${statusObj.color}`}>
                  {statusObj.text}
                </span>
              </div>
            </div>
          </div>

          {/* Heuristics Disclaimer & Advice */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
            <h4 className="text-xs font-semibold text-text uppercase tracking-wider">Why review?</h4>
            <p className="text-xs text-muted leading-relaxed">
              {getReviewAdvice()}
            </p>
            <p className="text-[10px] text-muted/40 italic">
              Confidence levels are based on recent task completion rates and are intended for tracking study habits, not formal academic prediction.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-subtle text-muted hover:bg-white/10 hover:text-text transition-all cursor-pointer"
            >
              Close
            </button>
            {['needs_review', 'learning'].includes(topic.status) && (
              <button
                onClick={() => {
                  navigate(`/practice?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.topic)}`);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/25 hover:text-white transition-all cursor-pointer"
              >
                Practice Topic
              </button>
            )}
            <button
              onClick={handleReviewClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-lg shadow-primary/25 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Review with AI Mentor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopicCard;
