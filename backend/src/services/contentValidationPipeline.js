/**
 * Content Validation Pipeline
 * Automated structural and pedagogical quality verification for AI-generated material.
 */

/**
 * Validate Course Structure
 */
export function validateCourseStructure(courseData) {
  const issues = [];

  if (!courseData || typeof courseData !== 'object') {
    return {
      isValid: false,
      qualityScore: 0,
      issues: [{ field: 'root', type: 'structural', message: 'Course data must be an object', severity: 'error' }],
    };
  }

  const title = (courseData.title || '').trim();
  if (title.length < 3) {
    issues.push({ field: 'title', type: 'structural', message: 'Course title must be at least 3 characters', severity: 'error' });
  }

  const description = (courseData.description || '').trim();
  if (description.length < 10) {
    issues.push({ field: 'description', type: 'pedagogical', message: 'Course description is too brief', severity: 'warning' });
  }

  const modules = Array.isArray(courseData.modules) ? courseData.modules : [];
  if (modules.length === 0) {
    issues.push({ field: 'modules', type: 'structural', message: 'Course must contain at least one module', severity: 'error' });
  } else {
    modules.forEach((mod, mIdx) => {
      const modTitle = (mod.title || '').trim();
      if (!modTitle) {
        issues.push({ field: 'modules[' + mIdx + '].title', type: 'structural', message: 'Module ' + (mIdx + 1) + ' has no title', severity: 'error' });
      }

      const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      if (lessons.length === 0) {
        issues.push({ field: 'modules[' + mIdx + '].lessons', type: 'pedagogical', message: 'Module ' + (mIdx + 1) + ' has no lessons', severity: 'warning' });
      } else {
        lessons.forEach((les, lIdx) => {
          if (!(les.title || '').trim()) {
            issues.push({ field: 'modules[' + mIdx + '].lessons[' + lIdx + '].title', type: 'structural', message: 'Lesson missing title', severity: 'error' });
          }
        });
      }
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const qualityScore = Math.max(0, Math.min(1.0, 1.0 - errorCount * 0.3 - warningCount * 0.1));

  return {
    isValid: !hasErrors,
    qualityScore: parseFloat(qualityScore.toFixed(2)),
    issues,
  };
}

/**
 * Validate Structured Lesson
 */
export function validateStructuredLesson(lessonData) {
  const issues = [];

  if (!lessonData || typeof lessonData !== 'object') {
    return {
      isValid: false,
      qualityScore: 0,
      issues: [{ field: 'root', type: 'structural', message: 'Lesson data must be an object', severity: 'error' }],
    };
  }

  const title = (lessonData.title || '').trim();
  if (title.length < 3) {
    issues.push({ field: 'title', type: 'structural', message: 'Lesson title is too short', severity: 'error' });
  }

  // Objectives check
  const objectives = Array.isArray(lessonData.objectives) ? lessonData.objectives : [];
  if (objectives.length === 0) {
    issues.push({ field: 'objectives', type: 'pedagogical', message: 'Lesson must have learning objectives', severity: 'error' });
  } else {
    objectives.forEach((obj, idx) => {
      const txt = String(obj).trim();
      if (txt.length < 8) {
        issues.push({ field: 'objectives[' + idx + ']', type: 'pedagogical', message: 'Objective is vague or overly short', severity: 'warning' });
      }
    });
  }

  // Explanation check
  const explanation = (lessonData.explanation || lessonData.content || '').trim();
  if (explanation.length < 40) {
    issues.push({ field: 'explanation', type: 'pedagogical', message: 'Explanation lacks depth (under 40 characters)', severity: 'warning' });
  }

  // Key concepts check
  const keyConcepts = Array.isArray(lessonData.keyConcepts) ? lessonData.keyConcepts : [];
  if (keyConcepts.length === 0) {
    issues.push({ field: 'keyConcepts', type: 'pedagogical', message: 'Key concepts list is recommended', severity: 'warning' });
  }

  // Summary check
  const summary = (lessonData.summary || '').trim();
  if (summary.length < 15) {
    issues.push({ field: 'summary', type: 'pedagogical', message: 'Summary section is missing or too short', severity: 'warning' });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const qualityScore = Math.max(0, Math.min(1.0, 1.0 - errorCount * 0.3 - warningCount * 0.08));

  return {
    isValid: !hasErrors,
    qualityScore: parseFloat(qualityScore.toFixed(2)),
    issues,
  };
}

/**
 * Validate Quiz Questions List
 */
export function validateQuizQuestions(questions) {
  const issues = [];

  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      isValid: false,
      qualityScore: 0,
      issues: [{ field: 'questions', type: 'structural', message: 'Quiz must contain at least one question', severity: 'error' }],
    };
  }

  const seenQuestions = new Set();

  questions.forEach((q, idx) => {
    const qText = (q.question || '').trim();
    if (qText.length < 5) {
      issues.push({ field: 'questions[' + idx + '].question', type: 'structural', message: 'Question prompt is too short', severity: 'error' });
    }

    // Duplicate check within batch
    const normalizedPrompt = qText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(normalizedPrompt)) {
      issues.push({ field: 'questions[' + idx + '].question', type: 'structural', message: 'Duplicate question detected within quiz', severity: 'error' });
    }
    seenQuestions.add(normalizedPrompt);

    // Options validation
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    if (options.length < 2) {
      issues.push({ field: 'questions[' + idx + '].options', type: 'structural', message: 'Question must have at least 2 options', severity: 'error' });
    }

    const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
    if (uniqueOptions.size < options.length) {
      issues.push({ field: 'questions[' + idx + '].options', type: 'structural', message: 'Options contain duplicate values', severity: 'error' });
    }

    // Correct answer matching
    const correctAnswer = (q.correctAnswer || '').trim();
    if (!correctAnswer) {
      issues.push({ field: 'questions[' + idx + '].correctAnswer', type: 'structural', message: 'Question missing correct answer', severity: 'error' });
    } else {
      const match = options.find((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
      if (!match) {
        issues.push({ field: 'questions[' + idx + '].correctAnswer', type: 'structural', message: 'Correct answer is not present in options array', severity: 'error' });
      }
    }

    // Explanation validation
    const explanation = (q.explanation || '').trim();
    if (!explanation || explanation.length < 5) {
      issues.push({ field: 'questions[' + idx + '].explanation', type: 'pedagogical', message: 'Question has no pedagogical explanation', severity: 'warning' });
    }
  });

  const hasErrors = issues.some((i) => i.severity === 'error');
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const qualityScore = Math.max(0, Math.min(1.0, 1.0 - errorCount * 0.25 - warningCount * 0.05));

  return {
    isValid: !hasErrors,
    qualityScore: parseFloat(qualityScore.toFixed(2)),
    issues,
  };
}

/**
 * Validate Flashcards List
 */
export function validateFlashcards(cards) {
  const issues = [];

  if (!Array.isArray(cards) || cards.length === 0) {
    return {
      isValid: false,
      qualityScore: 0,
      issues: [{ field: 'cards', type: 'structural', message: 'Deck must contain at least one card', severity: 'error' }],
    };
  }

  const seenFronts = new Set();

  cards.forEach((card, idx) => {
    const front = (card.front || '').trim();
    const back = (card.back || '').trim();

    if (front.length < 3) {
      issues.push({ field: 'cards[' + idx + '].front', type: 'structural', message: 'Flashcard front prompt is too short', severity: 'error' });
    }

    if (back.length < 3) {
      issues.push({ field: 'cards[' + idx + '].back', type: 'structural', message: 'Flashcard back definition is too short', severity: 'error' });
    }

    const normFront = front.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenFronts.has(normFront)) {
      issues.push({ field: 'cards[' + idx + '].front', type: 'structural', message: 'Duplicate flashcard prompt detected', severity: 'warning' });
    }
    seenFronts.add(normFront);
  });

  const hasErrors = issues.some((i) => i.severity === 'error');
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const qualityScore = Math.max(0, Math.min(1.0, 1.0 - errorCount * 0.3 - warningCount * 0.08));

  return {
    isValid: !hasErrors,
    qualityScore: parseFloat(qualityScore.toFixed(2)),
    issues,
  };
}

export default {
  validateCourseStructure,
  validateStructuredLesson,
  validateQuizQuestions,
  validateFlashcards,
};
