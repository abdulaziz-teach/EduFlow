import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Sparkles,
  ChevronRight,
  BookOpen,
  Code2,
  Binary,
  Languages,
  Zap,
  FlaskConical,
  Dna,
  TrendingUp,
  Globe,
} from 'lucide-react';
import studyPlanService from '../../services/studyPlan';
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
  const [searchParams] = useSearchParams();
  const currentLang = ['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz';
  const { user } = useAuth();

  const [subjectsMap, setSubjectsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [submitting] = useState(false);

  // URL query parametrlari (?subject=...&topic=...)
  const querySubject = searchParams.get('subject');
  const queryTopic = searchParams.get('topic');

  // Foydalanuvchi faqat o'zi tanlagan fanlar ro'yxati
  const userAllowedSubjects = useMemo(() => {
    if (Array.isArray(user?.subjects) && user.subjects.length > 0) {
      return user.subjects;
    }
    return ['Mathematics'];
  }, [user?.subjects]);

  // Faqat foydalanuvchi tanlagan fanlar konfiguratsiyasi
  const activeConfigs = useMemo(() => {
    return SUBJECTS_CONFIG.filter((cfg) =>
      userAllowedSubjects.some(
        (u) =>
          u.toLowerCase() === cfg.id.toLowerCase() ||
          u.toLowerCase() === cfg.title?.uz?.toLowerCase() ||
          u.toLowerCase() === cfg.title?.en?.toLowerCase()
      )
    );
  }, [userAllowedSubjects]);

  useEffect(() => {
    const loadTopicsPool = async () => {
      setLoading(true);
      const pool = {};

      // 1. Faqat tanlangan fanlarning mavzularini yuklash
      activeConfigs.forEach((cfg) => {
        const topics = cfg.topics[currentLang] || cfg.topics.uz || cfg.topics.en;
        pool[cfg.id] = new Set(topics);
      });

      // 2. Agar foydalanuvchi fanlari orasida SUBJECTS_CONFIG da topilmagani bo'lsa
      userAllowedSubjects.forEach((subj) => {
        if (!pool[subj]) {
          pool[subj] = new Set([
            `${subj} 1-dars - Asosiy tushunchalar`,
            `${subj} 2-dars - Qoidalar va amaliyot`,
            `${subj} 3-dars - Mashqlar yechish`,
            `${subj} 4-dars - Mustahkamlash`,
            `${subj} 5-dars - Murakkab misollar`,
            `${subj} 6-dars - Yakuniy test`,
          ]);
        }
      });

      // 3. O'quv rejasidagi mos mavzular bilan boyitish
      try {
        const planRes = await studyPlanService.getCurrent();
        if (planRes?.plan?.days) {
          planRes.plan.days.forEach((day) => {
            day.tasks.forEach((task) => {
              if (task.subject && task.title) {
                const isSubjAllowed = userAllowedSubjects.some(
                  (s) => s.toLowerCase() === task.subject.toLowerCase()
                );
                if (isSubjAllowed) {
                  const matchKey = Object.keys(pool).find(
                    (k) => k.toLowerCase() === task.subject.toLowerCase()
                  ) || task.subject;
                  if (!pool[matchKey]) pool[matchKey] = new Set();
                  pool[matchKey].add(task.title);
                }
              }
            });
          });
        }
      } catch (err) {
        // ignore
      }

      // Convert Sets to Arrays
      const formatted = {};
      Object.entries(pool).forEach(([subj, topicsSet]) => {
        formatted[subj] = Array.from(topicsSet);
      });

      setSubjectsMap(formatted);

      // Boshlang'ich fanni aniqlash
      const availableKeys = Object.keys(formatted);
      let initialSubj = availableKeys[0] || 'Mathematics';

      // Agar URL da ?subject=... kelgan bo'lsa
      if (querySubject) {
        const found = availableKeys.find(
          (k) => k.toLowerCase() === querySubject.toLowerCase()
        );
        if (found) initialSubj = found;
      }

      setSelectedSubject(initialSubj);

      // Boshlang'ich mavzuni aniqlash
      const topicsForSubj = formatted[initialSubj] || [];
      if (queryTopic && topicsForSubj.includes(queryTopic)) {
        setSelectedTopic(queryTopic);
      } else if (topicsForSubj.length > 0) {
        setSelectedTopic(topicsForSubj[0]);
      } else {
        setSelectedTopic('');
      }

      setLoading(false);
    };

    loadTopicsPool();
  }, [currentLang, activeConfigs, userAllowedSubjects, querySubject, queryTopic]);

  const handleSubjectChange = (subj) => {
    setSelectedSubject(subj);
    const topics = subjectsMap[subj] || [];
    if (topics.length > 0) {
      setSelectedTopic(topics[0]);
    } else {
      setSelectedTopic('');
    }
  };

  // Faqat tanlangan fan bo'yicha tavsiya
  const effectiveRecommendation = useMemo(() => {
    if (recommendation && recommendation.subject) {
      const isAllowed = userAllowedSubjects.some(
        (s) => s.toLowerCase() === recommendation.subject.toLowerCase()
      );
      if (isAllowed) return recommendation;
    }
    // Agar server tavsiyasi boshqa fanniki bo'lsa, birinchi tanlangan fandan tavsiya beramiz
    const firstSubj = userAllowedSubjects[0] || 'Mathematics';
    const cfg = activeConfigs.find(
      (c) => c.id.toLowerCase() === firstSubj.toLowerCase()
    );
    const topic = cfg?.topics?.[currentLang]?.[0] || `${firstSubj} 1-dars`;
    return {
      subject: firstSubj,
      topic,
      difficulty: 'medium',
      reason: currentLang === 'uz'
        ? "Tanlangan o'quv yo'nalishingiz bo'yicha tavsiya etildi."
        : currentLang === 'ru'
        ? "Рекомендовано по выбранному вами предмету."
        : "Recommended for your active learning track.",
    };
  }, [recommendation, userAllowedSubjects, activeConfigs, currentLang]);

  const handleStartRecommendation = () => {
    if (!effectiveRecommendation) return;
    onStart({
      subject: effectiveRecommendation.subject,
      topic: effectiveRecommendation.topic,
      difficulty: effectiveRecommendation.difficulty || 'medium',
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
        <span className="text-sm text-muted ml-2">
          {t('practice.loadingSubjects', { defaultValue: 'Darslar yuklanmoqda...' })}
        </span>
      </div>
    );
  }

  const subjectsList = Object.keys(subjectsMap);

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Recommended Practice Widget - Faqat foydalanuvchi fani bo'yicha */}
      {effectiveRecommendation && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                {t('practice.recommended', { defaultValue: 'Tavsiya etilgan amaliyot' })}
              </span>
              <h4 className="text-base font-bold text-text mt-0.5">{effectiveRecommendation.topic}</h4>
              <p className="text-xs text-muted mt-1 text-left">
                {effectiveRecommendation.reason}
              </p>
            </div>
          </div>
          <button
            onClick={handleStartRecommendation}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/10 shrink-0 cursor-pointer text-center"
          >
            {currentLang === 'uz' ? 'Amaliyotni boshlash' : currentLang === 'ru' ? 'Начать практику' : 'Start Practice'}
          </button>
        </div>
      )}

      {/* Quick Subject Category Pills - FAQAT FOYDALANUVCHI TANLAGAN FANLAR */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted uppercase tracking-wider block">
          {currentLang === 'uz' ? 'Tanlangan fanlaringiz' : currentLang === 'ru' ? 'Выбранные предметы' : 'Your Selected Subjects'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {subjectsList.map((subjKey) => {
            const cfg = SUBJECTS_CONFIG.find((c) => c.id.toLowerCase() === subjKey.toLowerCase()) || {
              id: subjKey,
              icon: 'BookOpen',
              color: 'from-primary to-indigo-600',
              title: { [currentLang]: subjKey },
            };
            const Icon = ICON_MAP[cfg.icon] || BookOpen;
            const isSelected = selectedSubject === subjKey;

            return (
              <button
                key={subjKey}
                type="button"
                onClick={() => handleSubjectChange(subjKey)}
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
                  {cfg.title?.[currentLang] || cfg.title?.uz || subjKey}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Configuration Form */}
      <form onSubmit={handleSubmit} className="p-5 md:p-6 rounded-2xl border border-white/5 bg-[#111827] space-y-5">
        <h3 className="text-sm font-bold text-text">
          {currentLang === 'uz' ? 'Amaliyot parametrlarini sozlash' : currentLang === 'ru' ? 'Настройка практики' : 'Configure Practice Session'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Subject Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">
              {currentLang === 'uz' ? 'Fan' : currentLang === 'ru' ? 'Предмет' : 'Subject'}
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
              {currentLang === 'uz' ? 'Mavzu / Dars' : currentLang === 'ru' ? 'Тема / Урок' : 'Topic / Lesson'}
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
              {currentLang === 'uz' ? 'Qiyinlik darajasi' : currentLang === 'ru' ? 'Сложность' : 'Difficulty'}
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
              {currentLang === 'uz' ? 'Savollar soni' : currentLang === 'ru' ? 'Количество вопросов' : 'Number of Questions'}
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
