import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import * as knowledgeUpdateEngine from './knowledgeUpdateEngine.js';

/**
 * Fetch quiz with correct answers and explanations stripped
 */
export const getQuizForStudent = async (quizId) => {
  const quiz = await Quiz.findById(quizId);
  if (!quiz || quiz.status !== 'published') {
    const err = new Error('Quiz not found or not published');
    err.statusCode = 404;
    throw err;
  }
  return quiz.toStudentView();
};

/**
 * Evaluate submitted answers server-side and calculate verified score
 */
export const submitAttempt = async ({ userId, quizId, answers = [] }) => {
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    const err = new Error('Invalid quiz ID format');
    err.statusCode = 400;
    err.errorCode = 'INVALID_ID';
    throw err;
  }

  // Explicitly select correctAnswer and explanation for evaluation
  const quiz = await Quiz.findById(quizId)
    .select('+questions.correctAnswer +questions.explanation');

  if (!quiz) {
    const err = new Error('Quiz not found');
    err.statusCode = 404;
    throw err;
  }

  const questionMap = new Map();
  let maxScore = 0;

  // Calculate max score from all questions and index valid quiz questions
  quiz.questions.forEach((q) => {
    questionMap.set(q._id.toString(), q);
    maxScore += q.points || 1;
  });

  const answeredQuestionIds = new Set();
  const evaluatedAnswers = [];
  let score = 0;

  for (const userAns of answers) {
    if (!userAns || typeof userAns !== 'object') continue;

    // Rule 5: Validate questionId format
    if (!userAns.questionId || !mongoose.Types.ObjectId.isValid(userAns.questionId)) {
      const err = new Error('Invalid questionId format');
      err.statusCode = 400;
      err.errorCode = 'INVALID_ID';
      throw err;
    }

    const qIdStr = userAns.questionId.toString();

    // Rule 1: FIRST ANSWER WINS — ignore subsequent duplicate answers for the same question
    if (answeredQuestionIds.has(qIdStr)) {
      continue;
    }

    // Rule 2: ONLY ACCEPT QUESTIONS BELONGING TO THIS QUIZ
    const qDoc = questionMap.get(qIdStr);
    if (!qDoc) {
      // Foreign or unrelated question ID — ignore and do not score
      continue;
    }

    answeredQuestionIds.add(qIdStr);

    const isCorrect =
      String(userAns.selectedAnswer).trim().toLowerCase() ===
      String(qDoc.correctAnswer).trim().toLowerCase();
    const points = isCorrect ? (qDoc.points || 1) : 0;
    score += points;

    evaluatedAnswers.push({
      questionId: qDoc._id,
      selectedAnswer: userAns.selectedAnswer ?? '',
      isCorrect,
      pointsAwarded: points,
    });
  }

  // Rule 4: Defense-in-depth clamp
  score = Math.min(score, maxScore);
  const percentage = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  const passed = percentage >= quiz.passingScore;

  const attempt = await QuizAttempt.create({
    userId,
    quizId,
    answers: evaluatedAnswers,
    score,
    maxScore,
    percentage,
    passed,
    completedAt: new Date(),
  });

  // Provide detailed review with explanations now that the attempt is complete
  const review = quiz.questions.map((q) => {
    const submitted = evaluatedAnswers.find((a) => a.questionId.toString() === q._id.toString());
    return {
      questionId: q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      userAnswer: submitted ? submitted.selectedAnswer : null,
      isCorrect: submitted ? submitted.isCorrect : false,
      pointsAwarded: submitted ? submitted.pointsAwarded : 0,
    };
  });

  // Asynchronously trigger knowledge mastery update & mistake tracking
  try {
    await knowledgeUpdateEngine.onQuizAttemptSubmitted({
      userId,
      attempt,
      quiz,
      review,
    });
  } catch (err) {
    console.error('Error in knowledgeUpdateEngine.onQuizAttemptSubmitted:', err.message);
  }

  return {
    attempt: {
      id: attempt._id,
      quizId: attempt.quizId,
      score,
      maxScore,
      percentage,
      passed,
      completedAt: attempt.completedAt,
    },
    review,
  };
};
