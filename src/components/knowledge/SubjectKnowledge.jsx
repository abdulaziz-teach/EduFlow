import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, HelpCircle } from 'lucide-react';
import TopicCard from './TopicCard';

const STATUS_STYLING = {
  new: 'text-muted border-muted/20 bg-muted/5',
  learning: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
  needs_review: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
  strong: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
};

const STATUS_TEXT = {
  new: 'New',
  learning: 'Learning',
  needs_review: 'Needs review',
  strong: 'Strong',
};

function SubjectKnowledge({ subjects, topics }) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);

  const toggleExpand = (subjName) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjName]: !prev[subjName],
    }));
  };

  const getTopicsForSubject = (subjName) => {
    return topics.filter((t) => t.subject === subjName);
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {subjects.map((sub, index) => {
        const isOpen = !!expandedSubjects[sub.subject];
        const subTopics = getTopicsForSubject(sub.subject);

        return (
          <div key={index} className="rounded-2xl border border-white/5 bg-[#111827] overflow-hidden">
            {/* Header Accordion Clickable */}
            <button
              onClick={() => toggleExpand(sub.subject)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-text text-sm md:text-base">{sub.subject}</h4>
                <p className="text-xs text-muted mt-0.5">
                  {sub.topics} {sub.topics === 1 ? 'topic' : 'topics'} tracked 
                  {sub.needsReview > 0 && ` • ${sub.needsReview} needs review`}
                  {sub.strong > 0 && ` • ${sub.strong} strong`}
                </p>
              </div>
              <div className="text-muted hover:text-text transition-colors">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {/* Collapsible content */}
            {isOpen && (
              <div className="border-t border-white/5 bg-black/[0.08] p-4 space-y-3">
                {subTopics.length === 0 ? (
                  <p className="text-xs text-muted/60 italic py-2 pl-2">No topic details logged yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {subTopics.map((topic) => {
                      const style = STATUS_STYLING[topic.status] || STATUS_STYLING.new;
                      const label = STATUS_TEXT[topic.status] || STATUS_TEXT.new;

                      return (
                        <div
                          key={topic._id}
                          onClick={() => setSelectedTopic(topic)}
                          className="group rounded-xl border border-white/5 bg-[#111827]/60 hover:bg-[#111827] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                              {topic.topic}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${style}`}>
                                {label}
                              </span>
                              <span className="text-[10px] text-muted flex items-center gap-0.5">
                                <Zap className="w-3 h-3 text-indigo-400" />
                                {topic.confidence}% signal
                              </span>
                            </div>
                          </div>

                          {/* Confidence tiny progress bar */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-24 h-2 rounded-full bg-white/[0.06] overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${topic.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-text w-8 text-right">
                              {topic.confidence}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Topic Card Detail Popup Modal */}
      <TopicCard
        topic={selectedTopic}
        isOpen={!!selectedTopic}
        onClose={() => setSelectedTopic(null)}
      />
    </div>
  );
}

export default SubjectKnowledge;
