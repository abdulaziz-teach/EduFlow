import * as learnerProfileService from '../services/learnerProfileService.js';
import * as weaknessDetectionService from '../services/weaknessDetectionService.js';
import * as recommendationEngine from '../services/recommendationEngine.js';
import * as dailyPlanService from '../services/dailyPlanService.js';
import * as aiMemoryService from '../services/aiMemoryService.js';
import * as aiQuizGeneratorService from '../services/aiQuizGeneratorService.js';
import AIUsageLog from '../models/AIUsageLog.js';
import AIFeedback from '../models/AIFeedback.js';

/**
 * @desc    Get derived learner profile
 * @route   GET /api/learning/profile
 * @access  Private
 */
export const getProfile = async (req, res, next) => {
  try {
    const force = req.query.refresh === 'true';
    const profile = await learnerProfileService.getLearnerProfile(req.user._id, force);

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detected weak topics with evidence & confidence scores
 * @route   GET /api/learning/weak-topics
 * @access  Private
 */
export const getWeakTopics = async (req, res, next) => {
  try {
    const weakTopics = await weaknessDetectionService.detectWeaknesses(req.user._id);

    res.status(200).json({
      success: true,
      count: weakTopics.length,
      weakTopics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get prioritized educational recommendations
 * @route   GET /api/learning/recommendations
 * @access  Private
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await recommendationEngine.getRecommendations(req.user._id);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get today's daily learning plan
 * @route   GET /api/learning/daily-plan
 * @access  Private
 */
export const getDailyPlan = async (req, res, next) => {
  try {
    const plan = await dailyPlanService.getOrCreateDailyPlan(req.user._id);

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Regenerate today's daily learning plan
 * @route   POST /api/learning/daily-plan/generate
 * @access  Private
 */
export const regenerateDailyPlan = async (req, res, next) => {
  try {
    const plan = await dailyPlanService.getOrCreateDailyPlan(req.user._id, true);

    res.status(200).json({
      success: true,
      plan,
      message: 'Daily plan regenerated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle task completion in today's daily learning plan
 * @route   PATCH /api/learning/daily-plan/tasks/:taskId
 * @access  Private
 */
export const toggleDailyPlanTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;

    const plan = await dailyPlanService.toggleDailyTask(
      req.user._id,
      taskId,
      completed !== undefined ? Boolean(completed) : true
    );

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's long-term educational memories
 * @route   GET /api/learning/memories
 * @access  Private
 */
export const getMemories = async (req, res, next) => {
  try {
    const memories = await aiMemoryService.getMemoriesForUser(req.user._id);

    res.status(200).json({
      success: true,
      memories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a specific AI memory (Privacy & GDPR control)
 * @route   DELETE /api/learning/memories/:id
 * @access  Private
 */
export const deleteMemory = async (req, res, next) => {
  try {
    const memoryId = req.params.id;
    const success = await aiMemoryService.deleteMemory(req.user._id, memoryId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Memory not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Memory deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate AI practice quiz questions for a topic or lesson
 * @route   POST /api/learning/quiz/generate
 * @access  Private
 */
export const generateQuiz = async (req, res, next) => {
  try {
    const { courseId, lessonId, topic, difficulty, count } = req.body;

    const result = await aiQuizGeneratorService.generatePracticeQuiz({
      courseId,
      lessonId,
      topic,
      difficulty,
      count,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI usage analytics and stats
 * @route   GET /api/learning/analytics
 * @access  Private
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const totalRequests = await AIUsageLog.countDocuments({ userId });
    const successfulRequests = await AIUsageLog.countDocuments({ userId, success: true });
    const failedRequests = await AIUsageLog.countDocuments({ userId, success: false });

    const recentLogs = await AIUsageLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('action mode latencyMs success createdAt');

    const totalFeedback = await AIFeedback.countDocuments({ userId });
    const helpfulFeedback = await AIFeedback.countDocuments({ userId, helpful: true });

    res.status(200).json({
      success: true,
      analytics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        totalFeedback,
        helpfulFeedback,
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProfile,
  getWeakTopics,
  getRecommendations,
  getDailyPlan,
  regenerateDailyPlan,
  toggleDailyPlanTask,
  getMemories,
  deleteMemory,
  generateQuiz,
  getAnalytics,
};
