import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import {
  listCourses,
  getCourseWithLessons,
  enrollInCourse,
  updateProgress,
} from '../services/courseService.js';
import { logAdminAction } from '../services/auditService.js';
import { searchCache } from '../services/searchCache.js';

/**
 * @desc    List courses with pagination and filtering
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req, res, next) => {
  try {
    const { category, level, search, page, limit, status } = req.query;
    const isAdmin = req.user?.role === 'admin';

    const result = await listCourses({
      category,
      level,
      status,
      search,
      page,
      limit,
      isAdmin,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get course by slug with lessons
 * @route   GET /api/courses/:slug
 * @access  Public
 */
export const getCourseBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const isAdmin = req.user?.role === 'admin';

    const course = await getCourseWithLessons(slug, isAdmin);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'COURSE_NOT_FOUND',
        message: 'Course not found',
      });
    }

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Protected (Admin only)
 */
export const createCourse = async (req, res, next) => {
  try {
    const { title, slug, description, thumbnail, category, level, language, tags, status } = req.body;

    const cleanSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    const course = await Course.create({
      title,
      slug: cleanSlug,
      description,
      thumbnail,
      category,
      level: level || 'beginner',
      language: language || 'en',
      tags: Array.isArray(tags) ? tags : [],
      status: status || 'draft',
      instructorId: req.user._id,
      publishedAt: status === 'published' ? new Date() : null,
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'course_created',
      targetType: 'Course',
      targetId: course._id,
      metadata: { title: course.title, slug: course.slug },
    });

    searchCache.clear();

    res.status(201).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update course details
 * @route   PATCH /api/courses/:id
 * @access  Protected (Admin only)
 */
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.instructorId; // Prevent reassignment

    if (updateData.status === 'published') {
      updateData.publishedAt = new Date();
    }

    const course = await Course.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'COURSE_NOT_FOUND',
        message: 'Course not found',
      });
    }

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'course_updated',
      targetType: 'Course',
      targetId: course._id,
      metadata: updateData,
    });

    searchCache.clear();

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete course
 * @route   DELETE /api/courses/:id
 * @access  Protected (Admin only)
 */
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndUpdate(id, { deletedAt: new Date(), status: 'archived' }, { new: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'COURSE_NOT_FOUND',
        message: 'Course not found',
      });
    }

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'course_deleted',
      targetType: 'Course',
      targetId: course._id,
      metadata: { title: course.title },
    });

    searchCache.clear();

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Enroll in a course
 * @route   POST /api/courses/:id/enroll
 * @access  Protected (Student)
 */
export const enroll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const enrollment = await enrollInCourse(req.user._id, id);

    res.status(201).json({
      success: true,
      message: 'Enrolled in course successfully',
      enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add lesson to a course
 * @route   POST /api/courses/:id/lessons
 * @access  Protected (Admin only)
 */
export const addLesson = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const { title, slug, description, content, videoUrl, order, duration, isPublished } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'COURSE_NOT_FOUND',
        message: 'Course not found',
      });
    }

    const cleanSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const lesson = await Lesson.create({
      courseId,
      title,
      slug: cleanSlug,
      description,
      content,
      videoUrl,
      order,
      duration: duration || 0,
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    searchCache.clear();

    res.status(201).json({
      success: true,
      lesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update lesson progress
 * @route   PATCH /api/courses/:courseId/lessons/:lessonId/progress
 * @access  Protected (Student)
 */
export const trackProgress = async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const { completed, watchTime, lastPosition } = req.body;

    const result = await updateProgress({
      userId: req.user._id,
      courseId,
      lessonId,
      completed,
      watchTime,
      lastPosition,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user course progress
 * @route   GET /api/courses/:id/progress
 * @access  Protected (Student)
 */
export const getMyProgress = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user._id;

    const [enrollment, progresses, totalLessons] = await Promise.all([
      Enrollment.findOne({ userId, courseId }),
      Progress.find({ userId, courseId }).lean(),
      Lesson.countDocuments({ courseId, isPublished: true }),
    ]);

    const completedLessons = progresses.filter((p) => p.completed).length;
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.json({
      success: true,
      enrolled: Boolean(enrollment),
      status: enrollment?.status || 'not_enrolled',
      completedLessons,
      totalLessons,
      percentage,
      lessonsProgress: progresses,
    });
  } catch (error) {
    next(error);
  }
};
