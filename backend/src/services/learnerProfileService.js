import LearnerProfile from '../models/LearnerProfile.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';
import FlashcardProgress from '../models/FlashcardProgress.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import { detectWeaknesses } from './weaknessDetectionService.js';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Get or compute the derived learner profile for a user
 */
export async function getLearnerProfile(userId, forceRecalculate = false) {
  if (!forceRecalculate) {
    const existing = await LearnerProfile.findOne({ userId });
    if (existing && existing.lastCalculatedAt) {
      const ageMs = Date.now() - new Date(existing.lastCalculatedAt).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return existing;
      }
    }
  }

  return await recalculateLearnerProfile(userId);
}

/**
 * Recalculate and persist the learner profile
 */
export async function recalculateLearnerProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // 1. Enrolled courses summary
  const enrollments = await Enrollment.find({ userId, status: 'active' }).populate('courseId');
  const enrolledCoursesSummary = [];

  for (const enr of enrollments) {
    if (!enr.courseId) continue;
    const course = enr.courseId;
    const totalLessons = await Lesson.countDocuments({ courseId: course._id, isPublished: true });
    const completedLessons = await Progress.countDocuments({
      userId,
      courseId: course._id,
      completed: true,
    });
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    enrolledCoursesSummary.push({
      courseId: course._id,
      title: course.title,
      progressPercentage: percentage,
      completedLessonsCount: completedLessons,
      totalLessonsCount: totalLessons,
    });
  }

  // 2. Completed lessons total
  const completedLessonsCount = await Progress.countDocuments({ userId, completed: true });

  // 3. Quiz stats
  const quizAttempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 });
  const totalQuizAttempts = quizAttempts.length;
  const passedQuizAttempts = quizAttempts.filter((a) => a.passed).length;
  const avgQuizPercentage =
    totalQuizAttempts > 0
      ? Math.round(quizAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / totalQuizAttempts)
      : 0;

  const recentQuizScores = quizAttempts.slice(0, 5).map((a) => ({
    score: a.score,
    maxScore: a.maxScore,
    percentage: a.percentage,
    date: a.createdAt,
  }));

  // 4. Flashcard stats
  const flashcardProgresses = await FlashcardProgress.find({ userId });
  const now = new Date();
  const dueCount = flashcardProgresses.filter((fp) => fp.dueAt && new Date(fp.dueAt) <= now).length;
  const totalReviewed = flashcardProgresses.filter((fp) => fp.repetitions > 0).length;
  const totalLapses = flashcardProgresses.reduce((acc, fp) => acc + (fp.lapses || 0), 0);
  const totalReps = flashcardProgresses.reduce((acc, fp) => acc + (fp.repetitions || 0), 0);
  const retentionRate = totalReps + totalLapses > 0 ? Math.round((totalReps / (totalReps + totalLapses)) * 100) : 100;

  // 5. Weak Topics (from weakness detection service)
  const weakTopics = await detectWeaknesses(userId);

  // 6. Strong Topics
  const strongKnowledgeTopics = await KnowledgeTopic.find({
    userId,
    $or: [{ status: 'strong' }, { confidence: { $gte: 75 } }],
  });

  const strongTopics = strongKnowledgeTopics.map((st) => ({
    topic: st.topic,
    subject: st.subject || 'General',
    confidence: Math.min(1.0, Math.round((st.confidence / 100) * 100) / 100),
    successCount: st.successfulActivities || 1,
    lastDemonstratedAt: st.lastPracticedAt || new Date(),
  }));

  // 7. Learning consistency
  const streak = user.streak || 0;
  // Calculate active days in last 30 days from Progress & Quiz timestamps
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentProgress = await Progress.find({
    userId,
    updatedAt: { $gte: thirtyDaysAgo },
  }).select('updatedAt');

  const uniqueDays = new Set(
    recentProgress.map((p) => new Date(p.updatedAt).toISOString().split('T')[0])
  );
  const activeDaysLast30Days = uniqueDays.size;
  const consistencyScore = Math.min(100, Math.round((activeDaysLast30Days / 30) * 80 + Math.min(20, streak * 2)));

  // Upsert profile document
  const profile = await LearnerProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        learningGoals: user.goal?.description || user.goal?.type || '',
        enrolledCoursesSummary,
        completedLessonsCount,
        quizStats: {
          totalAttempts: totalQuizAttempts,
          passedAttempts: passedQuizAttempts,
          averagePercentage: avgQuizPercentage,
          recentScores: recentQuizScores,
        },
        weakTopics,
        strongTopics,
        flashcardStats: {
          totalReviewed,
          dueCount,
          retentionRate,
          totalLapses,
        },
        learningConsistency: {
          streak,
          activeDaysLast30Days,
          consistencyScore,
        },
        preferredDifficulty: user.level || 'intermediate',
        preferredLearningStyle: user.learningStyle || 'mixed',
        lastCalculatedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  return profile;
}

export default {
  getLearnerProfile,
  recalculateLearnerProfile,
};
