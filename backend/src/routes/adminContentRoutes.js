import { Router } from 'express';
import protect, { requireRole } from '../middleware/authMiddleware.js';
import {
  generateCourse,
  generateLesson,
  generateQuiz,
  generateFlashcards,
  regenerateSection,
  validateDraftContent,
  approveGeneration,
  rejectGeneration,
  publishContent,
  getVersions,
  rollbackContent,
} from '../controllers/adminAiContentController.js';

const router = Router();

// Protect all content authoring endpoints — strictly Admin Only
router.use(protect);
router.use(requireRole('admin', 'super_admin', 'content_manager'));

// AI Generation endpoints
router.post('/ai/course', generateCourse);
router.post('/ai/lesson', generateLesson);
router.post('/ai/quiz', generateQuiz);
router.post('/ai/flashcards', generateFlashcards);
router.post('/ai/regenerate', regenerateSection);
router.post('/ai/validate', validateDraftContent);

// Human Review & Approval Workflow
router.post('/ai/generations/:id/approve', approveGeneration);
router.post('/ai/generations/:id/reject', rejectGeneration);

// Publishing Workflow
router.post('/:entityType/:id/publish', publishContent);

// Versioning & Non-Destructive Rollback
router.get('/:entityType/:id/versions', getVersions);
router.post('/:entityType/:id/rollback', rollbackContent);

export default router;
