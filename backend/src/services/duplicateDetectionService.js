import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';

/**
 * Compute Jaccard token overlap between two strings
 */
export function tokenSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const set1 = new Set(str1.toLowerCase().split(/\W+/).filter(Boolean));
  const set2 = new Set(str2.toLowerCase().split(/\W+/).filter(Boolean));
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Check if a course title or slug collides with existing courses
 */
export async function checkCourseDuplicates({ title, slug }) {
  const cleanTitle = (title || '').trim().toLowerCase();
  const cleanSlug = (slug || cleanTitle.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

  const matches = [];

  const exactSlug = await Course.findOne({ slug: cleanSlug, deletedAt: null }).select('_id title slug').lean();
  if (exactSlug) {
    matches.push({
      entityId: exactSlug._id,
      title: exactSlug.title,
      score: 1.0,
      reason: 'Exact slug collision with existing course',
    });
  }

  const existingCourses = await Course.find({ deletedAt: null }).select('_id title slug').limit(100).lean();
  for (const course of existingCourses) {
    if (exactSlug && String(course._id) === String(exactSlug._id)) continue;
    const sim = tokenSimilarity(cleanTitle, course.title);
    if (sim >= 0.75) {
      matches.push({
        entityId: course._id,
        title: course.title,
        score: parseFloat(sim.toFixed(2)),
        reason: 'High title similarity with existing course',
      });
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

/**
 * Check if lesson title collides within a course
 */
export async function checkLessonDuplicates({ courseId, title, slug }) {
  const cleanTitle = (title || '').trim().toLowerCase();
  const cleanSlug = (slug || cleanTitle.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

  const matches = [];

  if (courseId) {
    const existingLessons = await Lesson.find({ courseId }).select('_id title slug').lean();
    for (const les of existingLessons) {
      if (les.slug === cleanSlug) {
        matches.push({
          entityId: les._id,
          title: les.title,
          score: 1.0,
          reason: 'Exact lesson slug in this course',
        });
      } else {
        const sim = tokenSimilarity(cleanTitle, les.title);
        if (sim >= 0.75) {
          matches.push({
            entityId: les._id,
            title: les.title,
            score: parseFloat(sim.toFixed(2)),
            reason: 'High title similarity with sibling lesson in course',
          });
        }
      }
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

/**
 * Check if quiz questions duplicate existing questions
 */
export async function checkQuizDuplicates({ lessonId, questions = [] }) {
  const matches = [];

  const existingQuizzes = lessonId ? await Quiz.find({ lessonId }).select('questions title').lean() : [];
  const existingQuestions = [];
  existingQuizzes.forEach((qz) => {
    (qz.questions || []).forEach((q) => {
      existingQuestions.push({ quizId: qz._id, quizTitle: qz.title, text: q.question });
    });
  });

  for (const q of questions) {
    const qText = (q.question || '').trim();
    for (const eq of existingQuestions) {
      const sim = tokenSimilarity(qText, eq.text);
      if (sim >= 0.85) {
        matches.push({
          quizId: eq.quizId,
          existingQuestion: eq.text,
          duplicateQuestion: qText,
          score: parseFloat(sim.toFixed(2)),
          reason: 'Near-identical question found in existing lesson quiz',
        });
      }
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}

export default {
  tokenSimilarity,
  checkCourseDuplicates,
  checkLessonDuplicates,
  checkQuizDuplicates,
};
