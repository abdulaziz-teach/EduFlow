import * as knowledgeService from '../services/knowledgeService.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';

/**
 * @desc    Get knowledge tracking summary overview counts
 * @route   GET /api/knowledge/summary
 * @access  Private
 */
export const getSummary = async (req, res, next) => {
  try {
    const summary = await knowledgeService.getSummary(req.user._id);
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subjects knowledge stats aggregation
 * @route   GET /api/knowledge/subjects
 * @access  Private
 */
export const getSubjectsBreakdown = async (req, res, next) => {
  try {
    const subjects = await knowledgeService.getSubjectsBreakdown(req.user._id);
    res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get knowledge topics recommended for review
 * @route   GET /api/knowledge/recommendations
 * @access  Private
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await knowledgeService.getRecommendations(req.user._id);
    res.status(200).json({
      success: true,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed metrics for a tracked knowledge topic
 * @route   GET /api/knowledge/topics/:id
 * @access  Private
 */
export const getTopicDetail = async (req, res, next) => {
  try {
    const topicId = req.params.id;
    // Verify ownership of the knowledge topic record
    const topic = await KnowledgeTopic.findOne({ _id: topicId, userId: req.user._id });
    
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge topic not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      topic,
    });
  } catch (error) {
    next(error);
  }
};
