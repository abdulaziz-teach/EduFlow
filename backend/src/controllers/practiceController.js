import PracticeSession from '../models/PracticeSession.js';
import PracticeQuestion from '../models/PracticeQuestion.js';
import * as questionGenerationService from '../services/questionGenerationService.js';
import * as knowledgeService from '../services/knowledgeService.js';
import * as studyPlanService from '../services/studyPlanService.js';
import * as achievementService from '../services/achievementService.js';

/**
 * @desc    Generate and cache practice questions
 * @route   POST /api/practice/generate
 * @access  Private
 */
export const generateQuestions = async (req, res, next) => {
  try {
    const { subject, topic, difficulty, count } = req.body;

    // Validation
    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        message: 'Subject and Topic are required.',
      });
    }

    const questionCount = parseInt(count, 10) || 5;
    if (questionCount < 3 || questionCount > 10) {
      return res.status(400).json({
        success: false,
        message: 'Question count must be between 3 and 10.',
      });
    }

    const diff = (difficulty || 'medium').toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty value. Must be easy, medium, or hard.',
      });
    }

    await questionGenerationService.generateQuestions({
      subject,
      topic,
      difficulty: diff,
      count: questionCount,
    });

    res.status(200).json({
      success: true,
      message: 'Questions generated and cached successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start a new practice session
 * @route   POST /api/practice/sessions
 * @access  Private
 */
export const createSession = async (req, res, next) => {
  try {
    const { subject, topic, difficulty, count } = req.body;
    const userId = req.user._id;

    if (!subject || !topic) {
      return res.status(400).json({
        success: false,
        message: 'Subject and Topic are required.',
      });
    }

    const questionCount = parseInt(count, 10) || 5;
    if (questionCount < 3 || questionCount > 10) {
      return res.status(400).json({
        success: false,
        message: 'Question count must be between 3 and 10.',
      });
    }

    const diff = (difficulty || 'medium').toLowerCase();

    // 1. Fetch/Generate questions pool
    let sessionQuestions;
    try {
      sessionQuestions = await questionGenerationService.generateQuestions({
        subject,
        topic,
        difficulty: diff,
        count: questionCount,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'QUESTIONS_UNAVAILABLE',
        message: 'Could not generate practice questions right now.',
      });
    }

    // 2. Create the practice session document
    const questionsMapping = sessionQuestions.map((q, idx) => ({
      questionId: q._id,
      order: idx + 1,
      answer: null,
      isCorrect: null,
    }));

    const session = await PracticeSession.create({
      userId,
      subject,
      topic,
      questions: questionsMapping,
      totalQuestions: sessionQuestions.length,
      startedAt: new Date(),
    });

    // 3. Return sanitized questions array (hiding answers and explanations)
    const sanitizedQuestions = sessionQuestions.map((q, idx) => ({
      id: q._id,
      order: idx + 1,
      type: q.type,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        subject: session.subject,
        topic: session.topic,
        totalQuestions: session.totalQuestions,
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit an answer to a question in a practice session
 * @route   POST /api/practice/sessions/:id/answer
 * @access  Private
 */
export const submitAnswer = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { questionId, answer } = req.body;
    const userId = req.user._id;

    if (!questionId || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Question ID and answer content are required.',
      });
    }

    // 1. Fetch base question to verify existence and evaluate correctness securely on server
    const dbQuestion = await PracticeQuestion.findById(questionId);
    if (!dbQuestion) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Base question not found in system.',
      });
    }

    // 2. Evaluate correctness on backend securely
    let isCorrect = false;
    const studentAns = String(answer).trim();

    if (dbQuestion.type === 'multiple_choice' || dbQuestion.type === 'true_false') {
      isCorrect = studentAns.toLowerCase() === dbQuestion.correctAnswer.trim().toLowerCase();
    } else if (dbQuestion.type === 'short_answer') {
      const normStudent = studentAns.toLowerCase().replace(/\s+/g, ' ');
      const normCorrect = dbQuestion.correctAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
      isCorrect = normStudent === normCorrect;
    }

    // 3. Atomically update the specific unanswered question in this active session
    const updatedSession = await PracticeSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId,
        completed: false,
        questions: {
          $elemMatch: {
            questionId: dbQuestion._id,
            answer: null,
          },
        },
      },
      {
        $set: {
          'questions.$.answer': studentAns,
          'questions.$.isCorrect': isCorrect,
          'questions.$.answeredAt': new Date(),
        },
        $inc: {
          correctAnswers: isCorrect ? 1 : 0,
        },
      },
      { new: true }
    );

    // 4. Handle non-matching conditional update (already answered, completed, or access denied)
    if (!updatedSession) {
      const existingSession = await PracticeSession.findOne({ _id: sessionId, userId });
      if (!existingSession) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Practice session not found or access denied.',
        });
      }
      if (existingSession.completed) {
        return res.status(400).json({
          success: false,
          error: 'SESSION_COMPLETED',
          message: 'This practice session has already been completed.',
        });
      }
      const qExists = existingSession.questions.find((q) => q.questionId.toString() === questionId.toString());
      if (!qExists) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_QUESTION',
          message: 'Question does not belong to this practice session.',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'QUESTION_ALREADY_ANSWERED',
        message: 'This question has already been answered.',
      });
    }

    // 5. Log KnowledgeEvent only for the winning atomic request
    try {
      const typeLabel = isCorrect ? 'correct' : 'incorrect';
      await knowledgeService.logEvent(userId, updatedSession.subject, updatedSession.topic, 'review', typeLabel);
      await knowledgeService.logEvent(userId, updatedSession.subject, updatedSession.topic, 'review', 'practice');
    } catch (kErr) {
      console.error('Error integrating practice results in knowledge Service:', kErr.message);
    }

    res.status(200).json({
      success: true,
      correct: isCorrect,
      correctAnswer: dbQuestion.correctAnswer,
      explanation: dbQuestion.explanation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete a practice session and lock responses
 * @route   POST /api/practice/sessions/:id/complete
 * @access  Private
 */
export const completeSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user._id;

    const session = await PracticeSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Practice session not found or access denied.',
      });
    }

    if (session.completed) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_COMPLETED',
        message: 'Practice session is already completed.',
      });
    }

    // Verify at least one question has been answered
    const answeredCount = session.questions.filter((q) => q.answer !== null).length;
    if (answeredCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_ANSWERS',
        message: 'Cannot complete a session with zero answers.',
      });
    }

    // Atomically lock session
    const completedSession = await PracticeSession.findOneAndUpdate(
      { _id: sessionId, userId, completed: false },
      {
        $set: {
          completed: true,
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!completedSession) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_COMPLETED',
        message: 'Practice session is already completed.',
      });
    }

    // Trigger achievements check in background (non-blocking)
    try {
      await achievementService.checkAndUnlock(userId, 'first_practice');
      
      const completedSessions = await PracticeSession.find({ userId, completed: true });
      let totalQuestionsAnswered = 0;
      completedSessions.forEach((s) => {
        totalQuestionsAnswered += s.questions.filter((q) => q.answer !== null).length;
      });
      if (totalQuestionsAnswered >= 10) {
        await achievementService.checkAndUnlock(userId, '10_practice_questions');
      }
    } catch (achErr) {
      console.error('Error checking practice achievements:', achErr.message);
    }

    const total = completedSession.questions.length;
    const answered = completedSession.questions.filter((q) => q.answer !== null).length;
    const correct = completedSession.correctAnswers;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    res.status(200).json({
      success: true,
      result: {
        sessionId: completedSession._id,
        subject: completedSession.subject,
        topic: completedSession.topic,
        total,
        answered,
        correct,
        accuracy,
        completedAt: completedSession.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recommended topic for smart practice mode
 * @route   GET /api/practice/recommendation
 * @access  Private
 */
export const getRecommendation = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Check knowledge tracker recommendations first
    const recs = await knowledgeService.getRecommendations(userId);
    if (recs && recs.length > 0) {
      return res.status(200).json({
        success: true,
        recommendation: {
          subject: recs[0].subject,
          topic: recs[0].topic,
          reason: 'This topic could use more practice to strengthen understanding.',
        },
      });
    }

    // 2. Fallback to study plan today focus
    const plan = await studyPlanService.getCurrentPlan(userId);
    if (plan && plan.days && plan.days.length > 0) {
      // Find today's day block
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDay = plan.days.find((d) => d.date.toISOString().split('T')[0] === todayStr);

      if (todayDay && todayDay.tasks && todayDay.tasks.length > 0) {
        return res.status(200).json({
          success: true,
          recommendation: {
            subject: todayDay.tasks[0].subject,
            topic: knowledgeService.extractTopicFromTitle(todayDay.tasks[0].title),
            reason: "Start practicing today's active study plan focus.",
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      recommendation: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick-start a practice session using highest-priority recommended topic
 * @route   POST /api/practice/quick-start
 * @access  Private
 */
export const quickStartSession = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Determine recommended topic
    let targetSubject = null;
    let targetTopic = null;

    const recs = await knowledgeService.getRecommendations(userId);
    if (recs && recs.length > 0) {
      targetSubject = recs[0].subject;
      targetTopic = recs[0].topic;
    } else {
      const plan = await studyPlanService.getCurrentPlan(userId);
      if (plan && plan.days && plan.days.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDay = plan.days.find((d) => d.date.toISOString().split('T')[0] === todayStr);
        if (todayDay && todayDay.tasks && todayDay.tasks.length > 0) {
          targetSubject = todayDay.tasks[0].subject;
          targetTopic = knowledgeService.extractTopicFromTitle(todayDay.tasks[0].title);
        }
      }
    }

    // Fallback to first enrolled subject if no plan or knowledge topic
    if (!targetSubject || !targetTopic) {
      targetSubject = req.user.subjects?.[0] || 'General';
      targetTopic = 'Fundamentals';
    }

    // Reuse createSession logic with 5 questions
    req.body = {
      subject: targetSubject,
      topic: targetTopic,
      difficulty: 'medium',
      count: 5,
    };

    return createSession(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest 20 completed practice sessions
 * @route   GET /api/practice/history
 * @access  Private
 */
export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessions = await PracticeSession.find({ userId, completed: true })
      .sort({ completedAt: -1 })
      .limit(20);

    const formatted = sessions.map((s) => {
      const answeredCount = s.questions.filter((q) => q.answer !== null).length;
      const accuracy = answeredCount > 0 ? Math.round((s.correctAnswers / answeredCount) * 100) : 0;

      return {
        id: s._id,
        subject: s.subject,
        topic: s.topic,
        correct: s.correctAnswers,
        total: s.totalQuestions,
        accuracy,
        completedAt: s.completedAt,
      };
    });

    res.status(200).json({
      success: true,
      sessions: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed practice session (with answers/explanations if completed)
 * @route   GET /api/practice/sessions/:id
 * @access  Private
 */
export const getSessionDetails = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user._id;

    const session = await PracticeSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found or access denied.',
      });
    }

    const questionIds = session.questions.map((q) => q.questionId);
    const dbQuestions = await PracticeQuestion.find({ _id: { $in: questionIds } });

    const mappedQuestions = [];
    for (const sq of session.questions) {
      const dbQ = dbQuestions.find((q) => q._id.toString() === sq.questionId.toString());
      if (dbQ) {
        const item = {
          id: sq.questionId,
          order: sq.order,
          type: dbQ.type,
          question: dbQ.question,
          options: dbQ.options,
          difficulty: dbQ.difficulty,
          isAnswered: sq.answer !== null,
          isCorrect: sq.isCorrect,
          studentAnswer: sq.answer,
        };

        if (sq.answer !== null || session.completed) {
          item.correctAnswer = dbQ.correctAnswer;
          item.explanation = dbQ.explanation;
        }

        mappedQuestions.push(item);
      }
    }

    res.status(200).json({
      success: true,
      session: {
        id: session._id,
        subject: session.subject,
        topic: session.topic,
        totalQuestions: session.totalQuestions,
        correctAnswers: session.correctAnswers,
        completed: session.completed,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        questions: mappedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};
