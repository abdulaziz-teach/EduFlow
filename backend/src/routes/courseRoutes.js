import { Router } from 'express';
import {
  getCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  enroll,
  addLesson,
  trackProgress,
  getMyProgress,
} from '../controllers/courseController.js';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.get('/', getCourses);
router.get('/:slug', getCourseBySlug);

// Protected routes (Students)
router.post('/:id/enroll', protect, enroll);
router.get('/:id/progress', protect, getMyProgress);
router.patch('/:courseId/lessons/:lessonId/progress', protect, trackProgress);

// Protected routes (Admin only)
router.post('/', protect, requireAdmin, createCourse);
router.patch('/:id', protect, requireAdmin, updateCourse);
router.delete('/:id', protect, requireAdmin, deleteCourse);
router.post('/:id/lessons', protect, requireAdmin, addLesson);

export default router;
