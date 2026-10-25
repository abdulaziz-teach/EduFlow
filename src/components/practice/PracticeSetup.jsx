import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ChevronRight, BookOpen, Code2, Binary, Languages, Zap, FlaskConical, Dna, TrendingUp, Globe } from 'lucide-react';
import studyPlanService from '../../services/studyPlan';
import knowledgeService from '../../services/knowledge';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS_CONFIG } from '../../data/practicePool';

const ICON_MAP = {
  Code2,
  Binary,
  Languages,
  Zap,
  FlaskConical,
  Dna,
  BookOpen,
  TrendingUp,
  Globe,
};

function PracticeSetup({ recommendation, onStart }) {
  const { t, i18n } = useTranslation();
  const currentLang = ['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz';
  const { user } = useAuth();

  const [subjectsMap, setSubjectsMap] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedSubject, setSelectedSubject] = useState('Computer Science');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadTopicsPool = async () => {
      setLoading(true);
      const pool = {};

      // 1. Populate from rich multi-language SUBJECTS_CONFIG
      SUBJECTS_CONFIG.forEach((cfg) => {
        const topics = cfg.topics[currentLang] || cfg.topics.uz || cfg.topics.en;
        pool[cfg.id] = new Set(topics);
      });

      // 2. Also check if user has custom subjects
      if (user?.subjects && Array.isArray(user.subjects)) {
        user.subjects.forEach((subj) => {
          if (!pool[subj]) {
            pool[subj] = new Set([t('practice.generalTopic', { defaultValue: 'General Practice' })]);
          }
        });
      }

      // 3. Try to enrich with study plan topics if available
      try {
        const planRes = await studyPlanService.getCurrent();
        if (planRes?.plan?.days) {
          planRes.plan.days.forEach((day) => {
            day.tasks.forEach((task) => {
              if (task.subject && task.title) {
                if (!pool[task.subject]) pool[task.subject] = new Set();
                pool[task.subject].add(task.title);
              }
            });
          });
        }
      } catch (err) {
        // Study plan offline fallback is gracefully ignored
      }

      // Convert Sets to Arrays
      const formatted = {};
      Object.entries(pool).forEach(([subj, topicsSet]) => {
        formatted[subj] = Array.from(topicsSet);
      });

      setSubjectsMap(formatted);

      // Select initial subject and topic
      const defaultSubj = formatted['Computer Science'] ? 'Computer Science' : Object.keys(formatted)[0];
      setSelectedSubject(defaultSubj);
      if (formatted[defaultSubj]?.length > 0) {
        setSelectedTopic(formatted[defaultSubj][0]);
      }

      setLoading(false);
    };

    loadTopicsPool();
  }, [t, currentLang, user?.subjects]);

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
      difficulty: recommendation.difficulty || 'medium',
      count: 5,
      language: currentLang,
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
      language: currentLang,
    });
  };

  const getSubjectTitle = (subjectKey) => {
    const config = SUBJECTS_CONFIG.find((s) => s.id === subjectKey);
    if (config?.title?.[currentLang]) {
      return config.title[currentLang];
    }
    return subjectKey;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-sm text-muted ml-2">{t('practice.loadingSubjects', { defaultValue: 'Darslar yuklanmoqda...' })}</span>
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
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                {t('practice.recommended', { defaultValue: 'Tavsiya etilgan amaliyot' })}
              </span>
              <h4 className="text-base font-bold text-text mt-0.5">{recommendation.topic}</h4>
              <p className="text-xs text-muted mt-1 text-left">
                {t('practice.recommendationReason', { defaultValue: 'Bilimlarni mustahkamlash uchun tavsiya qilingan dars.' })}
              </p>
            </div>
          </div>
          <button
            onClick={handleStartRecommendation}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/10 shrink-0 cursor-pointer text-center"
          >
            {t('practice.startQuiz', { defaultValue: 'Testni boshlash' })}
          </button>
        </div>
      )}

      {/* Quick Subject Category Pills */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted uppercase tracking-wider block">
          {currentLang === 'uz' ? 'Fanlar va Amaliy darslar' : currentLang === 'ru' ? 'Предметы и Практика' : 'Subjects & Practice Tracks'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {SUBJECTS_CONFIG.map((cfg) => {
            const Icon = ICON_MAP[cfg.icon] || BookOpen;
            const isSelected = selectedSubject === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => handleSubjectChange(cfg.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10 font-bold'
                    : 'border-white/5 bg-white/[0.02] text-text hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${cfg.color} text-white`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs truncate font-medium">
                  {cfg.title[currentLang] || cfg.title.uz}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Setup Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 space-y-6">
        <h3 className="text-base font-bold text-text">
          {t('practice.configureTitle', { defaultValue: 'Amaliyot parametrlarini sozlash' })}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Subject Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('practice.subjectLabel', { defaultValue: 'Fan' })}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-text text-sm focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
            >
              {subjectsList.map((sub) => (
                <option key={sub} value={sub} className="bg-[#111827]">
                  {getSubjectTitle(sub)}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">
              {t('practice.topicLabel', { defaultValue: 'Mavzu / Dars' })}
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-text text-sm focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
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
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
              {t('practice.difficulty', { defaultValue: 'Qiyinlik darajasi' })}
            </label>
            <div className="flex gap-2">
              {[
                { id: 'easy', uz: 'Oson', ru: 'Легко', en: 'Easy' },
                { id: 'medium', uz: 'O‘rta', ru: 'Средне', en: 'Medium' },
                { id: 'hard', uz: 'Qiyin', ru: 'Сложно', en: 'Hard' },
              ].map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setDifficulty(diff.id)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    difficulty === diff.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-white/5 bg-white/[0.01] text-muted hover:bg-white/[0.03]'
                  }`}
                >
                  {diff[currentLang] || diff.uz}
                </button>
              ))}
            </div>
          </div>

          {/* Count Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
              {t('practice.questionCount', { defaultValue: 'Savollar soni' })}
            </label>
            <div className="flex gap-2">
              {[3, 5, 10].map((num) => (
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
                  {num} {currentLang === 'uz' ? 'ta savol' : currentLang === 'ru' ? 'вопросов' : 'questions'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            {currentLang === 'uz' ? 'Amaliyotni boshlash' : currentLang === 'ru' ? 'Начать практику' : 'Start Practice'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default PracticeSetup;
