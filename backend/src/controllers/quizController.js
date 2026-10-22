import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { getQuizForStudent, submitAttempt } from '../services/quizService.js';
import { logAdminAction } from '../services/auditService.js';

/**
 * @desc    Get quiz for student (answers stripped)
 * @route   GET /api/quizzes/:id
 * @access  Protected
 */
export const getQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid quiz ID format',
      });
    }
    const quiz = await getQuizForStudent(id);

    res.json({
      success: true,
      quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit quiz attempt and compute score server-side
 * @route   POST /api/quizzes/:id/attempt
 * @access  Protected
 */
export const submitQuiz = async (req, res, next) => {
  try {
    const { id: quizId } = req.params;
    const { answers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid quiz ID format',
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ANSWERS',
        message: 'Answers must be provided as an array',
      });
    }

    for (const ans of answers) {
      if (ans && ans.questionId && !mongoose.Types.ObjectId.isValid(ans.questionId)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID',
          message: 'Invalid questionId format',
        });
      }
    }

    const result = await submitAttempt({
      userId: req.user._id,
      quizId,
      answers,
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.errorCode === 'INVALID_ID' || error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.errorCode || 'INVALID_REQUEST',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get quiz attempts for the authenticated user
 * @route   GET /api/quizzes/:id/attempts
 * @access  Protected
 */
export const getQuizAttempts = async (req, res, next) => {
  try {
    const { id: quizId } = req.params;
    const attempts = await QuizAttempt.find({ userId: req.user._id, quizId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      attempts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a quiz for a lesson
 * @route   POST /api/quizzes
 * @access  Protected (Admin only)
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { lessonId, title, description, questions, passingScore, timeLimit, status } = req.body;

    const quiz = await Quiz.create({
      lessonId,
      title,
      description,
      questions,
      passingScore: passingScore || 70,
      timeLimit: timeLimit || 0,
      status: status || 'published',
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'quiz_created',
      targetType: 'Quiz',
      targetId: quiz._id,
      metadata: { title: quiz.title, lessonId },
    });

    res.status(201).json({
      success: true,
      quiz,
    });
  } catch (error) {
    next(error);
  }
};
