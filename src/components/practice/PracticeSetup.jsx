import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ChevronRight } from 'lucide-react';
import studyPlanService from '../../services/studyPlan';
import knowledgeService from '../../services/knowledge';
import { useAuth } from '../../context/AuthContext';

function PracticeSetup({ recommendation, onStart }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subjectsMap, setSubjectsMap] = useState({}); // { 'Mathematics': ['Quadratic Equations', ...] }
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadTopicsPool = async () => {
      setLoading(true);
      const pool = {};

      try {
        for (const subject of user?.subjects || []) {
          pool[subject] = new Set([t('practice.generalTopic')]);
        }

        // 1. Fetch study plan topics
        const planRes = await studyPlanService.getCurrent();
        if (planRes.plan && planRes.plan.days) {
          planRes.plan.days.forEach((day) => {
            day.tasks.forEach((task) => {
              const subj = task.subject;
              const topicName = extractTopicFromTitleLocal(task.title);
              if (subj && topicName) {
                if (!pool[subj]) pool[subj] = new Set();
                pool[subj].add(topicName);
              }
            });
          });
        }

        // 2. Fetch knowledge tracker topics
        const knowRes = await knowledgeService.getSubjects();
        if (knowRes.subjects) {
          knowRes.subjects.forEach((subObj) => {
            if (subObj.topicsList) {
              subObj.topicsList.forEach((t) => {
                if (!pool[subObj.subject]) pool[subObj.subject] = new Set();
                pool[subObj.subject].add(t.topic);
              });
            }
          });
        }

        // Convert Sets to Arrays
        const formatted = {};
        Object.entries(pool).forEach(([subj, topicsSet]) => {
          formatted[subj] = Array.from(topicsSet).sort();
        });

        setSubjectsMap(formatted);

        // Auto select first subject/topic if available
        const subKeys = Object.keys(formatted);
        if (subKeys.length > 0) {
          setSelectedSubject(subKeys[0]);
          if (formatted[subKeys[0]].length > 0) {
            setSelectedTopic(formatted[subKeys[0]][0]);
          }
        }
      } catch (err) {
        console.error('Failed to resolve topics pool:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTopicsPool();
  }, [t, user?.subjects]);

  // Sync topic selection on subject change
  const handleSubjectChange = (subj) => {
    setSelectedSubject(subj);
    const topics = subjectsMap[subj] || [];
    if (topics.length > 0) {
      setSelectedTopic(topics[0]);
    } else {
      setSelectedTopic('');
    }
  };

  const handleStartRecommendation = () => {
    if (!recommendation) return;
    onStart({
      subject: recommendation.subject,
      topic: recommendation.topic,
      difficulty,
      count,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSubject || !selectedTopic) return;
    onStart({
      subject: selectedSubject,
      topic: selectedTopic,
      difficulty,
      count,
    });
  };

  // Local title cleaner to avoid backend dependency import errors if any
  const extractTopicFromTitleLocal = (title) => {
    if (!title) return '';
    let topic = title.trim();
    const prefixes = [
      /^(study|review|practice|solve|revise|complete|read|write|learn)\s+/i,
      /^(key concepts of|problems on|problems for|notes for|introduction to|basics of|principles of|concept of)\s+/i,
      /^(key concepts|practice problems|problems|questions|exercise)\s+/i,
    ];
    let cleaned = true;
    while (cleaned) {
      cleaned = false;
      for (const regex of prefixes) {
        if (regex.test(topic)) {
          topic = topic.replace(regex, '');
          cleaned = true;
        }
      }
    }
    topic = topic.trim();
    if (!topic || topic.length < 3 || /^(study|homework|task|assignment|exam|quiz)\b/i.test(topic)) {
      return '';
    }
    return topic.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getSubjectLabel = (subject) => {
    const key = subject.replace(/\s+/g, '').replace(/^[A-Z]/, (letter) => letter.toLowerCase());
    return t(`onboarding.subjectNames.${key}`, { defaultValue: subject });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-sm text-muted ml-2">{t('practice.loadingSubjects')}</span>
      </div>
    );
  }

  const subjectsList = Object.keys(subjectsMap);

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Recommended Practice Widget */}
      {recommendation && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">{t('practice.recommended')}</span>
              <h4 className="text-base font-bold text-text mt-0.5">{recommendation.topic}</h4>
              <p className="text-xs text-muted mt-1 text-left">{t('practice.recommendationReason')}</p>
            </div>
          </div>
          <button
            onClick={handleStartRecommendation}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/10 shrink-0 cursor-pointer text-center"
          >
            {t('practice.startQuiz')}
          </button>
        </div>
      )}

      {subjectsList.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#111827] p-8 text-center max-w-md mx-auto">
          <h3 className="text-base font-bold text-text mb-2">{t('practice.noTopicsTitle')}</h3>
          <p className="text-xs text-muted mb-4">
            {t('practice.noTopicsDescription')}
          </p>
        </div>
      ) : (
        /* Setup Form */
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 space-y-6">
          <h3 className="text-base font-bold text-text">{t('practice.configureTitle')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('practice.subjectLabel')}</label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-text text-sm focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              >
                {subjectsList.map((sub) => (
                  <option key={sub} value={sub} className="bg-[#111827]">
                    {getSubjectLabel(sub)}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('practice.topicLabel')}</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-text text-sm focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              >
                {(subjectsMap[selectedSubject] || []).map((topic) => (
                  <option key={topic} value={topic} className="bg-[#111827]">
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">{t('practice.difficulty')}</label>
              <div className="flex gap-2">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer capitalize ${
                      difficulty === diff
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-white/5 bg-white/[0.01] text-muted hover:bg-white/[0.03]'
                    }`}
                  >
                    {t(`practice.${diff}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Count Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">{t('practice.questionCount')}</label>
              <div className="flex gap-2">
                {[5, 7, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      count === num
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-white/5 bg-white/[0.01] text-muted hover:bg-white/[0.03]'
                    }`}
                  >
                    {num} {t('practice.questionSuffix')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/5">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              {t('practice.startSession')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default PracticeSetup;
