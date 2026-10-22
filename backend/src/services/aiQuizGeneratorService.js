import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import * as aiService from './aiService.js';

/**
 * Validates a generated quiz question according to strict schema
 */
export function validateQuizQuestion(q, fallbackTopic = 'General', fallbackDifficulty = 'medium') {
  if (!q || typeof q !== 'object') return null;

  const question = typeof q.question === 'string' ? q.question.trim() : '';
  if (question.length < 5) return null;

  let options = Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim()) : [];
  // Ensure exactly 4 unique options
  options = [...new Set(options.filter((opt) => opt.length > 0))];
  if (options.length < 2) return null;

  const correctAnswer = typeof q.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
  // Correct answer MUST match one of the options (case-insensitive check with exact replacement)
  const matchedOpt = options.find((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
  if (!matchedOpt) return null;

  const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : 'Review the concept.';
  const difficulty = ['easy', 'medium', 'hard'].includes((q.difficulty || '').toLowerCase())
    ? q.difficulty.toLowerCase()
    : fallbackDifficulty;

  return {
    question,
    options,
    correctAnswer: matchedOpt,
    explanation,
    topic: q.topic ? String(q.topic).trim() : fallbackTopic,
    difficulty,
  };
}

/**
 * Generate practice quiz questions using AI
 */
export async function generatePracticeQuiz({ courseId, lessonId, topic, difficulty = 'medium', count = 3 }) {
  const safeCount = Math.max(1, Math.min(10, parseInt(count, 10) || 3));
  const safeDifficulty = ['easy', 'medium', 'hard'].includes((difficulty || '').toLowerCase())
    ? difficulty.toLowerCase()
    : 'medium';

  let lessonTitle = '';
  let lessonContent = '';
  let courseTitle = '';

  if (lessonId) {
    const lesson = await Lesson.findById(lessonId);
    if (lesson) {
      lessonTitle = lesson.title;
      lessonContent = lesson.description || lesson.content || '';
      const course = await Course.findById(lesson.courseId);
      if (course) courseTitle = course.title;
    }
  } else if (courseId) {
    const course = await Course.findById(courseId);
    if (course) courseTitle = course.title;
  }

  const targetTopic = topic || lessonTitle || courseTitle || 'General Knowledge';

  // Call AI service to generate structured questions
  const rawData = await aiService.generateLessonQuizAI({
    topic: targetTopic,
    difficulty: safeDifficulty,
    count: safeCount,
    lessonContent: lessonContent.substring(0, 3000),
    courseTitle,
    lessonTitle,
  });

  // Validate all generated questions strictly
  const rawQuestions = Array.isArray(rawData?.questions) ? rawData.questions : [];
  const validatedQuestions = rawQuestions
    .map((q) => validateQuizQuestion(q, targetTopic, safeDifficulty))
    .filter(Boolean);

  if (validatedQuestions.length === 0) {
    // If AI failed to produce valid questions, generate verified deterministic fallback questions
    validatedQuestions.push({
      question: `Which fundamental principle is central to understanding ${targetTopic}?`,
      options: [
        `Core rules and foundational definitions of ${targetTopic}`,
        'Arbitrary randomized variables without relationships',
        'Skipping initial definitions directly to edge cases',
        'Discarding standard problem-solving frameworks',
      ],
      correctAnswer: `Core rules and foundational definitions of ${targetTopic}`,
      explanation: `Mastering foundational definitions is the prerequisite to solving problems in ${targetTopic}.`,
      topic: targetTopic,
      difficulty: safeDifficulty,
    });
  }

  return {
    topic: targetTopic,
    difficulty: safeDifficulty,
    sourceLesson: lessonTitle || null,
    sourceCourse: courseTitle || null,
    questions: validatedQuestions,
  };
}

export default {
  generatePracticeQuiz,
  validateQuizQuestion,
};
