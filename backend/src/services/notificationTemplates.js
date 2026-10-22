/**
 * Notification Templates & Link Sanitization Service
 * Provides supportive, non-manipulative notification copy and secure routing.
 */

// Helper to sanitize internal deep links
export function sanitizeDeepLink(link) {
  if (!link || typeof link !== 'string') return '';
  const trimmed = link.trim();
  
  // Prevent javascript: or data: URIs or external protocol injections
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
    return '';
  }

  // If it starts with http:// or https://, ensure it belongs to the app or strip protocol
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return url.pathname + url.search + url.hash;
    } catch {
      return '';
    }
  }

  // Ensure internal route starts with '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

// Helper to sanitize plain text against HTML/script injection
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Standardized Notification Templates
 */
export const NOTIFICATION_TEMPLATES = {
  LEARNING_REMINDER: {
    title: (params) => params.title || 'Time for a quick learning session',
    message: (params) =>
      params.message ||
      `Keep your momentum going! Even 10 minutes on ${params.subject || 'your subjects'} makes a huge difference.`,
    link: (params) => sanitizeDeepLink(params.link || '/study-plan'),
    priority: 'normal',
  },
  DAILY_PLAN: {
    title: (params) => params.title || "Your Daily Plan is Ready",
    message: (params) =>
      params.message ||
      `You have ${params.taskCount || 'a few'} recommended tasks today to keep you on track.`,
    link: (params) => sanitizeDeepLink(params.link || '/daily-plan'),
    priority: 'normal',
  },
  STREAK_REMINDER: {
    title: (params) => params.title || 'Supportive Streak Reminder',
    // Positive, non-manipulative phrasing
    message: (params) =>
      params.message ||
      `You're on a ${params.streakDays || 1}-day streak! Ready for a quick study session today? We're cheering you on.`,
    link: (params) => sanitizeDeepLink(params.link || '/dashboard'),
    priority: 'normal',
  },
  STREAK_MILESTONE: {
    title: (params) => params.title || `Milestone Reached: ${params.streakDays}-Day Streak!`,
    message: (params) =>
      params.message ||
      `Incredible consistency! You've maintained your learning streak for ${params.streakDays} consecutive days.`,
    link: (params) => sanitizeDeepLink(params.link || '/profile'),
    priority: 'high',
  },
  QUIZ_REMINDER: {
    title: (params) => params.title || 'Quiz Ready for Review',
    message: (params) =>
      params.message ||
      `Test your knowledge on ${params.quizTitle || 'recent topics'} with a quick practice quiz.`,
    link: (params) => sanitizeDeepLink(params.link || `/quizzes`),
    priority: 'normal',
  },
  FLASHCARD_REVIEW: {
    title: (params) =>
      params.title ||
      (params.count ? `${params.count} Flashcards Due for Review` : 'Flashcards Due for Review'),
    message: (params) =>
      params.message ||
      `Spaced repetition optimizes your memory retention. Review ${params.count || 'your'} cards today!`,
    link: (params) => sanitizeDeepLink(params.link || `/flashcards`),
    priority: 'normal',
  },
  COURSE_PROGRESS: {
    title: (params) => params.title || 'Course Progress Milestone',
    message: (params) =>
      params.message ||
      `Great progress! You are ${params.percentage || 'further along'} in "${params.courseTitle || 'your course'}".`,
    link: (params) => sanitizeDeepLink(params.link || `/courses/${params.courseId || ''}`),
    priority: 'normal',
  },
  ACHIEVEMENT_UNLOCKED: {
    title: (params) => params.title || 'Achievement Unlocked!',
    message: (params) =>
      params.message ||
      `Congratulations! You earned the "${params.achievementName || 'Learner'}" badge.`,
    link: (params) => sanitizeDeepLink(params.link || '/profile'),
    priority: 'high',
  },
  RECOMMENDATION: {
    title: (params) => params.title || 'Personalized Study Recommendation',
    message: (params) =>
      params.message ||
      `Based on your mastery trends, reviewing ${params.topic || 'suggested lessons'} will boost your confidence.`,
    link: (params) => sanitizeDeepLink(params.link || '/courses'),
    priority: 'normal',
  },
  AI_INSIGHT: {
    title: (params) => params.title || 'AI Mentor Insight',
    message: (params) =>
      params.message ||
      params.insightText ||
      'Your AI Mentor analyzed your learning velocity and has tips for your study strategy.',
    link: (params) => sanitizeDeepLink(params.link || '/mentor'),
    priority: 'normal',
  },
  SYSTEM: {
    title: (params) => params.title || 'System Notification',
    message: (params) => params.message || 'Important update regarding your EduFlow account.',
    link: (params) => sanitizeDeepLink(params.link || '/notifications'),
    priority: 'normal',
  },
  SECURITY: {
    title: (params) => params.title || 'Security Notice',
    message: (params) =>
      params.message ||
      'Security alert: please review your account settings and recent activity.',
    link: (params) => sanitizeDeepLink(params.link || '/settings'),
    priority: 'urgent',
  },
};

/**
 * Format notification payload with safe fallback
 */
export function formatNotificationPayload(type, params = {}) {
  const normalizedType = String(type).toUpperCase();
  const template = NOTIFICATION_TEMPLATES[normalizedType];

  if (!template) {
    return {
      type,
      title: sanitizeText(params.title || 'EduFlow Update'),
      message: sanitizeText(params.message || 'You have a new update.'),
      link: sanitizeDeepLink(params.link || '/dashboard'),
      priority: params.priority || 'normal',
    };
  }

  return {
    type: normalizedType,
    title: sanitizeText(template.title(params)),
    message: sanitizeText(template.message(params)),
    link: template.link(params),
    priority: params.priority || template.priority,
  };
}
