import api from './api';

export const adminContentService = {
  // AI Generation
  generateCourse: (data) => api.post('/admin/content/ai/course', data),
  generateLesson: (data) => api.post('/admin/content/ai/lesson', data),
  generateQuiz: (data) => api.post('/admin/content/ai/quiz', data),
  generateFlashcards: (data) => api.post('/admin/content/ai/flashcards', data),
  regenerateSection: (data) => api.post('/admin/content/ai/regenerate', data),
  validateContent: (data) => api.post('/admin/content/ai/validate', data),

  // Approval Workflow
  approveGeneration: (id, data = {}) => api.post(/admin/content/ai/generations//approve, data),
  rejectGeneration: (id, data = {}) => api.post(/admin/content/ai/generations//reject, data),

  // Publishing
  publishContent: (entityType, id) => api.post(/admin/content///publish),

  // Versioning & Rollback
  getVersions: (entityType, id) => api.get(/admin/content///versions),
  rollbackVersion: (entityType, id, targetVersionNumber) =>
    api.post(/admin/content///rollback, { targetVersionNumber }),
};

export default adminContentService;
