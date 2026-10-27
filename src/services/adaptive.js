import api from './api.js';

/**
 * Generates a safe, localized client-side fallback recommendation
 * when the backend server is unreachable.
 */
function getLocalFallbackAction() {
  let userSubjects = ['Mathematics', 'Computer Science'];
  let lang = 'uz';

  try {
    const rawUser = localStorage.getItem('eduflow_local_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (Array.isArray(u.subjects) && u.subjects.length > 0) {
        userSubjects = u.subjects;
      }
    }
    const savedLang = localStorage.getItem('eduflow_language');
    if (savedLang) lang = savedLang;
  } catch {
    // Ignore storage parse errors
  }

  const primarySubject = userSubjects[0] || 'Mathematics';

  const localizedContent = {
    uz: {
      title: `${primarySubject}: Bilimlarni mustahkamlash`,
      subtitle: `${primarySubject} fani bo‘yicha rejalashtirilgan mashg‘ulot`,
      reason: 'Oflayn rejim: Ushbu tavsiya o‘quv profilingizda tanlangan fanlar asosida shakllantirildi.',
      ctaText: 'Mashg‘ulotni boshlash',
    },
    ru: {
      title: `${primarySubject}: Закрепление знаний`,
      subtitle: `Запланированное занятие по предмету "${primarySubject}"`,
      reason: 'Автономный режим: Рекомендация сформирована на основе выбранных в профиле предметов.',
      ctaText: 'Начать занятие',
    },
    en: {
      title: `${primarySubject}: Reinforce Concepts`,
      subtitle: `Scheduled study practice for ${primarySubject}`,
      reason: 'Offline mode: This recommendation is generated locally from your active study profile subjects.',
      ctaText: 'Start Session',
    },
  };

  const content = localizedContent[lang] || localizedContent.en;

  return {
    success: true,
    isFallback: true,
    action: {
      type: 'continue_lesson',
      priority: 4,
      title: content.title,
      subtitle: content.subtitle,
      reason: content.reason,
      recommendedDifficulty: 'medium',
      ctaText: content.ctaText,
      actionPayload: {
        subject: primarySubject,
        route: '/study-plan',
      },
      isFallback: true,
    },
  };
}

export const getNextAction = async () => {
  try {
    const res = await api.get('/adaptive/next-action');
    if (res?.action) {
      return res;
    }
    return getLocalFallbackAction();
  } catch (err) {
    // Graceful, transparent local fallback when backend is unreachable
    return getLocalFallbackAction();
  }
};

export const getMasteries = () =>
  api.get('/adaptive/mastery');

export const explainMastery = (topic, subject = '') =>
  api.get(`/adaptive/mastery/${encodeURIComponent(topic)}/explain${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`);

export const checkPrerequisites = (topic, subject = '') =>
  api.get(`/adaptive/prerequisites/${encodeURIComponent(topic)}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`);

export const getMistakes = (limit = 20) =>
  api.get(`/adaptive/mistakes?limit=${limit}`);

export const resolveMistake = (id) =>
  api.post(`/adaptive/mistakes/${id}/resolve`);

export const getAdminInsights = () =>
  api.get('/adaptive/admin/insights');

const adaptiveService = {
  getNextAction,
  getMasteries,
  explainMastery,
  checkPrerequisites,
  getMistakes,
  resolveMistake,
  getAdminInsights,
};

export default adaptiveService;
