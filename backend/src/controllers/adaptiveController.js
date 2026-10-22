import * as nextActionEngine from '../services/nextActionEngine.js';
import * as masteryService from '../services/masteryService.js';
import * as prerequisiteEngine from '../services/prerequisiteEngine.js';
import * as mistakeService from '../services/mistakeService.js';
import UserTopicMastery from '../models/UserTopicMastery.js';
import MistakeLog from '../models/MistakeLog.js';
import Progress from '../models/Progress.js';
import QuizAttempt from '../models/QuizAttempt.js';

/**
 * @desc    Get the Next Best Action for the learner
 * @route   GET /api/adaptive/next-action
 * @access  Private
 */
export const getNextAction = async (req, res, next) => {
  try {
    const action = await nextActionEngine.determineNextAction(req.user._id);

    res.status(200).json({
      success: true,
      action,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all topic masteries for the learner
 * @route   GET /api/adaptive/mastery
 * @access  Private
 */
export const getMasteryList = async (req, res, next) => {
  try {
    const masteries = await masteryService.getUserMasteries(req.user._id);

    res.status(200).json({
      success: true,
      count: masteries.length,
      masteries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed explainability for a specific topic's mastery score
 * @route   GET /api/adaptive/mastery/:topic/explain
 * @access  Private
 */
export const explainTopicMastery = async (req, res, next) => {
  try {
    const { topic } = req.params;
    const { subject } = req.query;

    const record = await masteryService.getTopicMastery(req.user._id, topic, subject);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Topic mastery record not found.',
      });
    }

    const prereqs = await prerequisiteEngine.checkPrerequisites(req.user._id, topic, record.subject);

    res.status(200).json({
      success: true,
      topic: record.topic,
      subject: record.subject,
      knowledgeScore: record.knowledgeScore,
      confidence: record.confidence,
      status: record.status,
      recommendedDifficulty: record.recommendedDifficulty,
      evidenceCount: record.evidenceCount,
      correctCount: record.correctCount,
      incorrectCount: record.incorrectCount,
      explanation: record.explanation,
      lastPracticedAt: record.lastPracticedAt,
      prerequisites: prereqs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check prerequisite satisfaction for a topic
 * @route   GET /api/adaptive/prerequisites/:topic
 * @access  Private
 */
export const checkTopicPrerequisites = async (req, res, next) => {
  try {
    const { topic } = req.params;
    const { subject } = req.query;

    const result = await prerequisiteEngine.checkPrerequisites(req.user._id, topic, subject);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unresolved mistakes for the learner
 * @route   GET /api/adaptive/mistakes
 * @access  Private
 */
export const getMistakes = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const mistakes = await mistakeService.getUnresolvedMistakes(req.user._id, limit);

    res.status(200).json({
      success: true,
      count: mistakes.length,
      mistakes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve a mistake after successful review/retry
 * @route   POST /api/adaptive/mistakes/:id/resolve
 * @access  Private
 */
export const resolveMistake = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resolved = await mistakeService.resolveMistake(req.user._id, id);

    if (!resolved) {
      return res.status(404).json({
        success: false,
        message: 'Mistake log not found or already resolved.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mistake marked as resolved.',
      mistake: resolved,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate curriculum insights (Admin only)
 * @route   GET /api/adaptive/admin/insights
 * @access  Private (Admin only)
 */
export const getAdminInsights = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Admin authorization required.',
      });
    }

    // 1. Most difficult topics (lowest average knowledge score across learners)
    const difficultTopics = await UserTopicMastery.aggregate([
      { $match: { evidenceCount: { $gte: 2 } } },
      {
        $group: {
          _id: '$topic',
          subject: { $first: '$subject' },
          avgScore: { $avg: '$knowledgeScore' },
          totalLearners: { $sum: 1 },
          needsReviewCount: {
            $sum: { $cond: [{ $eq: ['$status', 'needs_review'] }, 1, 0] },
          },
        },
      },
      { $sort: { avgScore: 1 } },
      { $limit: 10 },
    ]);

    // 2. Common incorrect questions
    const commonMistakes = await MistakeLog.aggregate([
      {
        $group: {
          _id: '$question',
          topic: { $first: '$topic' },
          errorCount: { $sum: 1 },
        },
      },
      { $sort: { errorCount: -1 } },
      { $limit: 10 },
    ]);

    // 3. Aggregate completion and quiz pass rate
    const totalQuizAttempts = await QuizAttempt.countDocuments();
    const passedAttempts = await QuizAttempt.countDocuments({ passed: true });
    const overallPassRate = totalQuizAttempts > 0 ? Math.round((passedAttempts / totalQuizAttempts) * 100) : 0;

    const totalLessonProgress = await Progress.countDocuments();
    const completedLessons = await Progress.countDocuments({ completed: true });
    const lessonCompletionRate =
      totalLessonProgress > 0 ? Math.round((completedLessons / totalLessonProgress) * 100) : 0;

    res.status(200).json({
      success: true,
      insights: {
        difficultTopics: difficultTopics.map((t) => ({
          topic: t._id,
          subject: t.subject,
          averageScore: Math.round(t.avgScore * 100) / 100,
          learnersEncountered: t.totalLearners,
          learnersNeedingReview: t.needsReviewCount,
        })),
        commonMistakes: commonMistakes.map((m) => ({
          question: m._id,
          topic: m.topic,
          occurrences: m.errorCount,
        })),
        metrics: {
          totalQuizAttempts,
          overallPassRate,
          completedLessons,
          lessonCompletionRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getNextAction,
  getMasteryList,
  explainTopicMastery,
  checkTopicPrerequisites,
  getMistakes,
  resolveMistake,
  getAdminInsights,
};
