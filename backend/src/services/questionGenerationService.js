import OpenAI from 'openai';
import PracticeQuestion from '../models/PracticeQuestion.js';
import { normalizeTopic } from './knowledgeService.js';

let _openai;
function getApiKey() {
  return process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
}

function getClient() {
  if (!_openai) {
    const key = getApiKey();
    if (!key) {
      throw new Error('AI_API_KEY or OPENAI_API_KEY environment variable is not set');
    }
    _openai = new OpenAI({
      apiKey: key,
      timeout: 20000, // 20-second explicit upstream timeout
      maxRetries: 2,
    });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are EduFlow's adaptive smart practice question generator.
Your job is to generate educational questions for a student on a specific topic.
Generate only structured JSON matching the requested schema. Do not output markdown code blocks or explanations outside the JSON.`;

/**
 * Validate a single generated question object.
 * Returns true if valid, false otherwise.
 */
export function validateQuestion(q, { subject, topic, difficulty }) {
  if (!q || typeof q !== 'object') return false;
  if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') return false;
  if (!q.correctAnswer || typeof q.correctAnswer !== 'string' || q.correctAnswer.trim() === '') return false;
  if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim() === '') return false;
  
  const validTypes = ['multiple_choice', 'true_false', 'short_answer'];
  if (!validTypes.includes(q.type)) return false;

  // Multiple Choice validation
  if (q.type === 'multiple_choice') {
    if (!Array.isArray(q.options) || q.options.length < 3) return false;
    // Check unique options
    const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (unique.size !== q.options.length) return false;
    // Check correct answer exists in options
    const match = q.options.some((o) => o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase());
    if (!match) return false;
  }

  // True/False validation
  if (q.type === 'true_false') {
    if (!Array.isArray(q.options) || q.options.length !== 2) return false;
    const cleanOpts = q.options.map((o) => o.trim().toLowerCase());
    if (!cleanOpts.includes('true') || !cleanOpts.includes('false')) return false;
    const cleanCorrect = q.correctAnswer.trim().toLowerCase();
    if (cleanCorrect !== 'true' && cleanCorrect !== 'false') return false;
  }

  return true;
}

/**
 * Generate questions for a given subject, topic, and difficulty.
 * Searches database cache first, generating new ones via OpenAI only on cache miss.
 */
export async function generateQuestions({ subject, topic, difficulty, count }) {
  const normalizedSubject = normalizeTopic(subject);
  const normalizedTopic = normalizeTopic(topic);
  const normalizedDiff = (difficulty || 'medium').toLowerCase();

  // 1. Check existing questions in database (cached question bank)
  let existing = await PracticeQuestion.find({
    subject: normalizedSubject,
    topic: normalizedTopic,
    difficulty: normalizedDiff,
  });

  // 2. If we do not have enough questions, call AI to generate a batch
  if (existing.length < count) {
    const needed = count - existing.length;
    console.log(`Cache miss. Need ${needed} new questions. Call OpenAI...`);
    const generated = await generateFromAI({
      subject: normalizedSubject,
      topic: normalizedTopic,
      difficulty: normalizedDiff,
      count: Math.max(needed, 5), // Generate at least 5 to populate cache for future sessions
    });

    if (generated && generated.length > 0) {
      // Validate and insert
      const validQuestions = generated.filter((q) =>
        validateQuestion(q, { subject: normalizedSubject, topic: normalizedTopic, difficulty: normalizedDiff })
      );

      if (validQuestions.length > 0) {
        const saved = await PracticeQuestion.insertMany(
          validQuestions.map((q) => ({
            subject: normalizedSubject,
            topic: normalizedTopic,
            type: q.type,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: normalizedDiff,
            createdBy: 'ai',
          }))
        );
        existing = [...existing, ...saved];
      }
    }
  }

  // If we still have absolutely nothing, throw error (failover)
  if (existing.length === 0) {
    throw new Error('QUESTIONS_UNAVAILABLE');
  }

  // 3. Shuffle and sample 'count' questions
  const shuffled = [...existing].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Request questions from OpenAI chat completion
 */
async function generateFromAI({ subject, topic, difficulty, count }) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith('your_openai_api_key') || apiKey.startsWith('change_this')) {
    // Return mock questions for development if API Key is placeholder
    return getMockQuestions(subject, topic, difficulty, count);
  }

  const prompt = `Generate exactly ${count} educational questions for a practice session.
Parameters:
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

Required output JSON schema structure:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "short_answer",
      "question": "concise and clear question content",
      "options": ["option 1", "option 2", "option 3", "option 4"], // only for multiple_choice or true_false. true_false options must be exactly ["True", "False"]. Leave empty for short_answer.
      "correctAnswer": "exact matching correct option text or short answer response",
      "explanation": "educational details explaining why it is correct",
      "difficulty": "${difficulty}"
    }
  ]
}

Provide a mixture of question types where appropriate.
Avoid empty strings. Options in multiple choice must be unique.`;

  try {
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const response = await getClient().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response');

    const result = JSON.parse(content);
    return result.questions || [];
  } catch (err) {
    console.error('OpenAI quiz generation failed:', err.message);
    return [];
  }
}

/**
 * Mock questions builder for offline dev bounds
 */
function getMockQuestions(subject, topic, difficulty, count) {
  return Array.from({ length: count }, (_, i) => {
    const qNum = i + 1;
    if (i % 3 === 0) {
      return {
        type: 'multiple_choice',
        question: `Sample multiple choice question ${qNum} about ${topic}?`,
        options: ['Incorrect A', 'Correct Answer Option', 'Incorrect B', 'Incorrect C'],
        correctAnswer: 'Correct Answer Option',
        explanation: `This is a sample explanation showing why the Correct Answer option is the right fit.`,
        difficulty,
      };
    } else if (i % 3 === 1) {
      return {
        type: 'true_false',
        options: ['True', 'False'],
        question: `True or False: Topic ${topic} represents a core block in ${subject}?`,
        correctAnswer: 'True',
        explanation: `Yes, ${topic} is an essential structural concept in ${subject}.`,
        difficulty,
      };
    } else {
      return {
        type: 'short_answer',
        question: `State the primary purpose or main concept behind ${topic}?`,
        options: [],
        correctAnswer: 'learning',
        explanation: `The core focus is learning and step-by-step progress.`,
        difficulty,
      };
    }
  });
}
