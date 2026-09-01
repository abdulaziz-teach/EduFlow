import * as progressService from '../services/progressService.js';

/**
 * @desc    Get progress statistics summary
 * @route   GET /api/progress/summary
 * @access  Private
 */
export const getSummary = async (req, res, next) => {
  try {
    const summary = await progressService.getProgressSummary(req.user._id);
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subject progress statistics
 * @route   GET /api/progress/subjects
 * @access  Private
 */
export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await progressService.getSubjectProgress(req.user._id);
    res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get daily study activity (past 30 days)
 * @route   GET /api/progress/activity
 * @access  Private
 */
export const getActivity = async (req, res, next) => {
  try {
    const activity = await progressService.getDailyActivity(req.user._id);
    res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get weekly aggregated learning digest
 * @route   GET /api/progress/weekly-digest
 * @access  Private
 */
export const getWeeklyDigest = async (req, res, next) => {
  try {
    const digest = await progressService.getWeeklyDigest(req.user._id);
    res.status(200).json({
      success: true,
      digest,
    });
  } catch (error) {
    next(error);
  }
};
