import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import { retrieveGroundedChunks } from './contentRetrievalService.js';

/**
 * Fetch course and lesson grounding context for AI prompt injection
 */
export async function getCourseGroundingContext(userId, courseId, lessonId, queryText = '') {
  let groundedCourse = null;
  let groundedLesson = null;

  // 1. Direct fetch if explicit IDs provided
  if (courseId) {
    groundedCourse = await Course.findById(courseId);
  }
  if (lessonId) {
    groundedLesson = await Lesson.findById(lessonId);
    if (groundedLesson && !groundedCourse) {
      groundedCourse = await Course.findById(groundedLesson.courseId);
    }
  }

  // 2. If neither provided, attempt to match user's active enrolled courses to query text
  if (!groundedCourse && queryText && userId) {
    const enrollments = await Enrollment.find({ userId, status: 'active' }).populate('courseId');
    const lowerQuery = queryText.toLowerCase();

    for (const enr of enrollments) {
      if (!enr.courseId) continue;
      const courseTitle = enr.courseId.title.toLowerCase();
      const courseCategory = enr.courseId.category.toLowerCase();

      if (lowerQuery.includes(courseTitle) || (courseCategory.length > 3 && lowerQuery.includes(courseCategory))) {
        groundedCourse = enr.courseId;
        // Grab first published lesson or current progress lesson
        groundedLesson = await Lesson.findOne({ courseId: groundedCourse._id, isPublished: true }).sort({ order: 1 });
        break;
      }
    }
  }

  // 3. If still not grounded and query text is present, use multi-entity RAG chunk retrieval
  if (!groundedCourse && !groundedLesson && queryText) {
    try {
      const rag = await retrieveGroundedChunks({
        userId,
        query: queryText,
        courseId,
        lessonId,
        maxChunks: 3,
      });

      if (rag.isGrounded && rag.groundingContext) {
        return {
          isGrounded: true,
          courseTitle: rag.topCourseTitle || 'Course Curriculum',
          lessonTitle: 'Retrieved Knowledge Excerpts',
          contextSnippet: rag.groundingContext,
          courseId: rag.chunks[0]?.courseId || null,
          lessonId: rag.chunks[0]?.lessonId || null,
          chunks: rag.chunks,
        };
      }
    } catch (_ragErr) {
      // Non-blocking fallback
    }
  }

  if (!groundedCourse && !groundedLesson) {
    return {
      isGrounded: false,
      contextSnippet: null,
      courseTitle: null,
      lessonTitle: null,
    };
  }

  const courseTitle = groundedCourse?.title || 'Unknown Course';
  const lessonTitle = groundedLesson?.title || 'General Course Content';
  const lessonSummary = groundedLesson?.description || groundedLesson?.content?.substring(0, 800) || '';

  const contextSnippet = `Grounding Source: EduFlow Course "${courseTitle}", Lesson "${lessonTitle}"
Relevant Content:
"""
${lessonSummary.trim()}
"""
Instructions for AI grounding:
- Treat the above Course Content as authoritative for this discussion.
- If answering from this content, cite it naturally as part of the lesson.
- If introducing concepts beyond this lesson content, explicitly identify them as general knowledge.`;

  return {
    isGrounded: true,
    courseTitle,
    lessonTitle,
    contextSnippet,
    courseId: groundedCourse?._id,
    lessonId: groundedLesson?._id,
  };
}

export default {
  getCourseGroundingContext,
};
