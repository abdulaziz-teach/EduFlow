import UserTopicMastery from '../models/UserTopicMastery.js';
import FlashcardProgress from '../models/FlashcardProgress.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { checkPrerequisites } from './prerequisiteEngine.js';

/**
 * Determine the single highest-value Next Best Action (NBA) for a learner
 */
export async function determineNextAction(userId) {
  // 1. Check for Overdue Spaced Repetition Flashcards (Priority 1)
  const now = new Date();
  const dueCount = await FlashcardProgress.countDocuments({
    userId,
    dueAt: { $lte: now },
  });

  if (dueCount > 0) {
    return {
      type: 'review_flashcards',
      priority: 1,
      title: 'Review Due Flashcards',
      subtitle: `${dueCount} card(s) ready for spaced repetition`,
      reason: 'Spaced repetition reviews at optimal intervals strengthen memory pathways and prevent forgetting.',
      recommendedDifficulty: 'medium',
      ctaText: 'Start Review',
      actionPayload: {
        route: '/flashcards',
        dueCount,
      },
    };
  }

  // 2. Check for Prerequisite Remediation Needs (Priority 2)
  const masteries = await UserTopicMastery.find({ userId });
  const activeEnrolledCourses = await Enrollment.find({ userId, status: 'active' }).populate('courseId');

  if (activeEnrolledCourses.length > 0 && activeEnrolledCourses[0].courseId) {
    const course = activeEnrolledCourses[0].courseId;
    const completedProgress = await Progress.find({ userId, courseId: course._id, completed: true }).select('lessonId');
    const completedSet = new Set(completedProgress.map((p) => p.lessonId.toString()));
    const currentLesson = await Lesson.findOne({
      courseId: course._id,
      isPublished: true,
      _id: { $nin: Array.from(completedSet) },
    }).sort({ order: 1 });

    if (currentLesson && currentLesson.topics?.length > 0) {
      const topic = currentLesson.topics[0];
      const prereqStatus = await checkPrerequisites(userId, topic, course.category);

      if (!prereqStatus.satisfied && prereqStatus.blockingPrerequisite) {
        return {
          type: 'study_prerequisite',
          priority: 2,
          title: `Build Foundation: ${prereqStatus.blockingPrerequisite.topic}`,
          subtitle: `Prerequisite for upcoming "${currentLesson.title}"`,
          reason: prereqStatus.reason,
          recommendedDifficulty: 'easy',
          ctaText: 'Practice Prerequisite',
          actionPayload: {
            topic: prereqStatus.blockingPrerequisite.topic,
            subject: course.category,
            route: '/practice',
          },
        };
      }
    }
  }

  // 3. Check for Active Weak Topics Needing Review (Priority 3)
  const weakTopic = masteries.find((m) => m.status === 'needs_review');
  if (weakTopic) {
    return {
      type: 'practice_weak_topic',
      priority: 3,
      title: `Reinforce: ${weakTopic.topic}`,
      subtitle: `Estimated mastery is ${(weakTopic.knowledgeScore * 100).toFixed(0)}%`,
      reason: `Recommended because recent practice accuracy on "${weakTopic.topic}" indicates extra practice may help solidify the concept.`,
      recommendedDifficulty: weakTopic.recommendedDifficulty || 'easy',
      ctaText: 'Practice Concept',
      actionPayload: {
        topic: weakTopic.topic,
        subject: weakTopic.subject,
        difficulty: weakTopic.recommendedDifficulty || 'easy',
        route: '/practice',
      },
    };
  }

  // 4. Continue Current Active Course Lesson (Priority 4)
  if (activeEnrolledCourses.length > 0 && activeEnrolledCourses[0].courseId) {
    const course = activeEnrolledCourses[0].courseId;
    const completedProgress = await Progress.find({ userId, courseId: course._id, completed: true }).select('lessonId');
    const completedSet = new Set(completedProgress.map((p) => p.lessonId.toString()));
    const nextLesson = await Lesson.findOne({
      courseId: course._id,
      isPublished: true,
      _id: { $nin: Array.from(completedSet) },
    }).sort({ order: 1 });

    if (nextLesson) {
      return {
        type: 'continue_lesson',
        priority: 4,
        title: `Continue: Lesson ${nextLesson.order}`,
        subtitle: `${nextLesson.title} (${course.title})`,
        reason: 'Recommended because continuing sequential lessons maintains steady conceptual progression.',
        recommendedDifficulty: 'medium',
        ctaText: 'Open Lesson',
        actionPayload: {
          courseId: course._id,
          lessonId: nextLesson._id,
          route: `/courses/${course._id}/lessons/${nextLesson._id}`,
        },
      };
    }
  }

  // 5. Retry Recent Failed Quiz (Priority 5)
  const recentFailedAttempt = await QuizAttempt.findOne({ userId, passed: false }).sort({ createdAt: -1 });
  if (recentFailedAttempt) {
    return {
      type: 'retry_quiz',
      priority: 5,
      title: 'Review Recent Quiz',
      subtitle: `Previous score: ${recentFailedAttempt.percentage}%`,
      reason: 'Recommended because re-testing after an initial struggle helps correct misunderstandings before moving forward.',
      recommendedDifficulty: 'medium',
      ctaText: 'Review Quiz',
      actionPayload: {
        quizId: recentFailedAttempt.quizId,
        route: `/quizzes/${recentFailedAttempt.quizId}`,
      },
    };
  }

  // 6. Default: Mixed Concept Practice
  const targetTopic = masteries[0]?.topic || 'Key Concepts';
  return {
    type: 'mixed_practice',
    priority: 6,
    title: `Practice: ${targetTopic}`,
    subtitle: 'Keep your knowledge sharp',
    reason: 'Recommended because steady practice strengthens long-term recall and increases confidence.',
    recommendedDifficulty: 'medium',
    ctaText: 'Start Practice',
    actionPayload: {
      topic: targetTopic,
      route: '/practice',
    },
  };
}

export default {
  determineNextAction,
};
