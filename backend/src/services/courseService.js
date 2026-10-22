import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import * as knowledgeUpdateEngine from './knowledgeUpdateEngine.js';
import { escapeRegex, isSearchLengthValid, MAX_SEARCH_LENGTH } from '../utils/regexHelper.js';

/**
 * List courses with pagination and filters
 */
export const listCourses = async ({
  category,
  level,
  status = 'published',
  search,
  page = 1,
  limit = 20,
  isAdmin = false,
}) => {
  const query = { deletedAt: null };

  if (!isAdmin) {
    query.status = 'published';
  } else if (status) {
    query.status = status;
  }

  if (category) query.category = category;
  if (level) query.level = level;

  if (search && typeof search === 'string') {
    const clean = search.trim();
    if (clean && isSearchLengthValid(clean, MAX_SEARCH_LENGTH)) {
      const searchRegex = new RegExp(escapeRegex(clean), 'i');
      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ];
    }
  }

  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('instructorId', 'displayName name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Course.countDocuments(query),
  ]);

  return {
    courses,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Get single course with its ordered lessons
 */
export const getCourseWithLessons = async (slug, isAdmin = false) => {
  const courseQuery = { slug, deletedAt: null };
  if (!isAdmin) {
    courseQuery.status = 'published';
  }

  const course = await Course.findOne(courseQuery)
    .populate('instructorId', 'displayName name avatar')
    .lean();

  if (!course) {
    return null;
  }

  const lessonQuery = { courseId: course._id };
  if (!isAdmin) {
    lessonQuery.isPublished = true;
  }

  const lessons = await Lesson.find(lessonQuery)
    .sort({ order: 1 })
    .select('title slug description duration order isPublished')
    .lean();

  return { ...course, lessons };
};

/**
 * Enroll user in course with duplicate prevention
 */
export const enrollInCourse = async (userId, courseId) => {
  const course = await Course.findOne({ _id: courseId, status: 'published', deletedAt: null });
  if (!course) {
    const err = new Error('Course not found or not published');
    err.statusCode = 404;
    throw err;
  }

  let enrollment;
  try {
    enrollment = await Enrollment.findOneAndUpdate(
      { userId, courseId },
      {
        $setOnInsert: {
          enrolledAt: new Date(),
          status: 'active',
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      enrollment = await Enrollment.findOne({ userId, courseId });
    } else {
      throw err;
    }
  }

  return enrollment;
};

/**
 * Atomic lesson progress update and course completion calculation
 */
export const updateProgress = async ({
  userId,
  courseId,
  lessonId,
  completed = false,
  watchTime = 0,
  lastPosition = 0,
}) => {
  // Validate lesson belongs to course
  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson) {
    const err = new Error('Lesson not found in this course');
    err.statusCode = 404;
    throw err;
  }

  // Ensure positive values
  const safeWatchTime = Math.max(0, Number(watchTime) || 0);
  const safeLastPosition = Math.max(0, Number(lastPosition) || 0);

  const updateFields = {
    $inc: { watchTime: safeWatchTime },
    $set: { lastPosition: safeLastPosition },
  };

  if (completed) {
    updateFields.$set.completed = true;
    updateFields.$set.completedAt = new Date();
  }

  const progress = await Progress.findOneAndUpdate(
    { userId, lessonId },
    {
      ...updateFields,
      $setOnInsert: {
        courseId,
        userId,
        lessonId,
      },
    },
    { upsert: true, new: true }
  );

  // Check overall course progress
  const [totalLessons, completedLessons] = await Promise.all([
    Lesson.countDocuments({ courseId, isPublished: true }),
    Progress.countDocuments({ userId, courseId, completed: true }),
  ]);

  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (percentage >= 100) {
    await Enrollment.findOneAndUpdate(
      { userId, courseId, status: 'active' },
      { status: 'completed', completedAt: new Date() }
    );
  }

  // Trigger knowledge state update if lesson completed
  if (completed) {
    try {
      const course = await Course.findById(courseId);
      await knowledgeUpdateEngine.onLessonProgressUpdated({
        userId,
        lesson,
        course,
        completed: true,
      });
    } catch (err) {
      console.error('Error in onLessonProgressUpdated:', err.message);
    }
  }

  return {
    progress,
    courseProgress: {
      completedLessons,
      totalLessons,
      percentage,
    },
  };
};
