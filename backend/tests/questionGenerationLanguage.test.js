import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMockQuestions, validateQuestion } from '../src/services/questionGenerationService.js';

const subjects = [
  'Mathematics',
  'English',
  'Physics',
  'Biology',
  'Chemistry',
  'History',
  'Computer Science',
  'Other',
];

describe('Localized, subject-specific practice questions', () => {
  it('builds distinct subject-focused questions and answer choices in all supported languages', () => {
    for (const language of ['en', 'ru', 'uz']) {
      const answers = new Set();
      for (const subject of subjects) {
        const questions = getMockQuestions(subject, 'Algebra', 'medium', 5, language);
        assert.equal(questions.length, 5);
        assert.ok(questions.every((question) => question.language === language));
        assert.ok(questions.every((question) => question.type === 'multiple_choice'));
        assert.ok(questions.every((question) => question.options.includes(question.correctAnswer)));
        assert.ok(questions.every((question) => question.question.includes('Algebra')));
        assert.ok(questions.every((question) => !question.question.startsWith('Sample')));
        answers.add(questions[0].correctAnswer);
      }
      assert.equal(answers.size, subjects.length);
    }
  });

  it('validates true/false answer options in the learner selected language', () => {
    const options = {
      en: ['True', 'False'],
      ru: ['Верно', 'Неверно'],
      uz: ['To‘g‘ri', 'Noto‘g‘ri'],
    };

    for (const [language, localizedOptions] of Object.entries(options)) {
      assert.equal(validateQuestion({
        type: 'true_false',
        question: 'A valid question about the subject?',
        options: localizedOptions,
        correctAnswer: localizedOptions[0],
        explanation: 'A localized explanation.',
      }, { subject: 'Mathematics', topic: 'Algebra', difficulty: 'easy', language }), true);
    }
  });

  it('falls back to English for unsupported locales', () => {
    const [question] = getMockQuestions('Mathematics', 'Algebra', 'easy', 1, 'fr');
    assert.equal(question.language, 'en');
    assert.match(question.question, /Mathematics/);
  });
});
