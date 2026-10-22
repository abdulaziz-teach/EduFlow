import { getLearnerProfile } from './learnerProfileService.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';
import FlashcardProgress from '../models/FlashcardProgress.js';

/**
 * Generate prioritized educational recommendations
 */
export async function getRecommendations(userId) {
  const profile = await getLearnerProfile(userId);
  const recommendations = [];

  // 1. Spaced Repetition Priority (Overdue Flashcards)
  if (profile.flashcardStats?.dueCount > 0) {
    recommendations.push({
      id: 'rec_flashcards_due',
      type: 'flashcard_review',
      priority: 1, // Highest learning priority: preventing memory decay
      title: 'Review Overdue Flashcards',
      description: `You have ${profile.flashcardStats.dueCount} flashcard(s) due for spaced repetition review today.`,
      reason: 'Spaced repetition reviews at optimal intervals maximize long-term retention and prevent forgetting.',
      action: {
        type: 'navigate',
        path: '/flashcards',
        label: 'Start Review',
      },
    });
  }

  // 2. Weakness Remediation Priority (Practicing Confirmed Weak Topics)
  if (profile.weakTopics && profile.weakTopics.length > 0) {
    const highestWeakness = profile.weakTopics[0];
    recommendations.push({
      id: `rec_weakness_${highestWeakness.topic.replace(/\s+/g, '_').toLowerCase()}`,
      type: 'practice_weakness',
      priority: 2,
      title: `Strengthen: ${highestWeakness.topic}`,
      description: `Focus practice on "${highestWeakness.topic}" to overcome recent mistakes.`,
      reason: `Our system detected recurring difficulties in this topic (${(highestWeakness.confidence * 100).toFixed(0)}% confidence). Targeted practice now prevents future gaps.`,
      action: {
        type: 'practice',
        subject: highestWeakness.subject,
        topic: highestWeakness.topic,
        label: 'Practice Weak Topic',
      },
    });
  }

  // 3. Active Course Continuation Priority
  const activeEnrollments = await Enrollment.find({ userId, status: 'active' }).populate('courseId');
  for (const enr of activeEnrollments) {
    if (!enr.courseId) continue;
    const courseId = enr.courseId._id;

    // Find first unfinished published lesson in this course
    const allLessons = await Lesson.find({ courseId, isPublished: true }).sort({ order: 1 });
    const completedProgress = await Progress.find({ userId, courseId, completed: true }).select('lessonId');
    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId.toString()));

    const nextLesson = allLessons.find((l) => !completedLessonIds.has(l._id.toString()));
    if (nextLesson) {
      recommendations.push({
        id: `rec_continue_course_${courseId}`,
        type: 'continue_lesson',
        priority: 3,
        title: `Continue: ${enr.courseId.title}`,
        description: `Next up: Lesson ${nextLesson.order} — "${nextLesson.title}".`,
        reason: 'Maintaining regular lesson progression solidifies conceptual flow and maintains your study streak.',
        action: {
          type: 'navigate',
          path: `/courses/${courseId}/lessons/${nextLesson._id}`,
          label: 'Continue Lesson',
        },
      });
      break; // Only recommend next lesson for top enrolled course
    }
  }

  // 4. Low Quiz Score Reinforcement
  if (profile.quizStats?.recentScores?.length > 0) {
    const lowestRecentQuiz = profile.quizStats.recentScores.find((s) => s.percentage < 70);
    if (lowestRecentQuiz) {
      recommendations.push({
        id: 'rec_quiz_retake',
        type: 'quiz_practice',
        priority: 4,
        title: 'Review Recent Quiz Concepts',
        description: `Revisit concepts from your recent quiz where score was ${lowestRecentQuiz.percentage}%.`,
        reason: 'Immediate remediation after a difficult quiz reinforces tricky questions before misconceptions become ingrained.',
        action: {
          type: 'navigate',
          path: '/practice',
          label: 'Take Practice Quiz',
        },
      });
    }
  }

  // 5. Explore new course if no active enrollments
  if (activeEnrollments.length === 0) {
    const popularCourse = await Course.findOne({ status: 'published' }).sort({ createdAt: -1 });
    if (popularCourse) {
      recommendations.push({
        id: `rec_explore_${popularCourse._id}`,
        type: 'explore_course',
        priority: 5,
        title: `Explore: ${popularCourse.title}`,
        description: popularCourse.description || 'Start learning today with structured lessons.',
        reason: 'Enroll in a course aligned with your academic goals to start building your foundation.',
        action: {
          type: 'navigate',
          path: `/courses/${popularCourse._id}`,
          label: 'View Course',
        },
      });
    }
  }

  // Sort by priority (1 is highest)
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
}

export default {
  getRecommendations,
};
