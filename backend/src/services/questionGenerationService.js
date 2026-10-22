import OpenAI from 'openai';
import PracticeQuestion from '../models/PracticeQuestion.js';
import { normalizeTopic } from './knowledgeService.js';
import { shouldUseMockAI } from '../utils/aiConfig.js';

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

const QUESTION_COPY = {
  en: {
    trueFalse: ['True', 'False'],
    prompts: [
      'What is the best first step when studying {topic} in {subject}?',
      'Which approach helps solve a {subject} task about {topic} accurately?',
      'How can you check your understanding of {topic} in {subject}?',
      'What should you do before choosing an answer about {topic} in {subject}?',
      'Which method best supports a clear explanation of {topic} in {subject}?',
      'What final check should you make for a {subject} answer about {topic}?',
      'Which method should guide your work with {topic} in {subject}?',
      'How can you avoid common errors while working on {topic} in {subject}?',
      'What should you use to support your reasoning about {topic} in {subject}?',
      'How can you explain your reasoning about {topic} in {subject} clearly?',
    ],
    subjects: {
      mathematics: {
        label: 'Mathematics',
        answer: 'Identify the known values, choose the relevant rule, and verify the result.',
      },
      english: {
        label: 'English',
        answer: 'Read the context, apply the relevant language rule, and reread the sentence.',
      },
      physics: {
        label: 'Physics',
        answer: 'List the known quantities and units, choose a suitable law, and check the units.',
      },
      biology: {
        label: 'Biology',
        answer: 'Identify the organisms or processes and explain their relationships using evidence.',
      },
      chemistry: {
        label: 'Chemistry',
        answer: 'Identify the substances and particles, apply the relevant rule, and check the equation.',
      },
      history: {
        label: 'History',
        answer: 'Place events in context and support the explanation with reliable evidence.',
      },
      computerscience: {
        label: 'Computer Science',
        answer: 'Trace the inputs and steps, then test the expected and edge-case results.',
      },
      other: {
        label: 'this subject',
        answer: 'Use the topic’s core ideas, work through the steps, and check the result.',
      },
    },
    distractors: [
      'Guess without reading the question carefully.',
      'Ignore the subject’s rules and definitions.',
      'Skip checking the reasoning and result.',
    ],
    explanation: 'This approach applies the core methods of {subject} and checks the reasoning about {topic}.',
  },
  ru: {
    trueFalse: ['Верно', 'Неверно'],
    prompts: [
      'С чего лучше начать изучение темы «{topic}» по {subject}?',
      'Какой подход поможет точно решить задание по {subject} на тему «{topic}»?',
      'Как проверить понимание темы «{topic}» по {subject}?',
      'Что сделать перед выбором ответа на вопрос по теме «{topic}» по {subject}?',
      'Как яснее объяснить тему «{topic}» по {subject}?',
      'Какую итоговую проверку выполнить для ответа по теме «{topic}» по {subject}?',
      'Какой метод выбрать для работы над темой «{topic}» по {subject}?',
      'Как избежать типичных ошибок при изучении темы «{topic}» по {subject}?',
      'Какими фактами обосновать ответ по теме «{topic}» по {subject}?',
      'Как ясно объяснить ход рассуждений по теме «{topic}» по {subject}?',
    ],
    subjects: {
      mathematics: {
        label: 'математике',
        answer: 'Определить известные величины, выбрать подходящее правило и проверить результат.',
      },
      english: {
        label: 'английскому языку',
        answer: 'Внимательно прочитать контекст, применить языковое правило и перечитать предложение.',
      },
      physics: {
        label: 'физике',
        answer: 'Записать известные величины и единицы измерения, выбрать закон и проверить единицы.',
      },
      biology: {
        label: 'биологии',
        answer: 'Определить организмы или процессы и объяснить их взаимосвязь с опорой на факты.',
      },
      chemistry: {
        label: 'химии',
        answer: 'Определить вещества и частицы, применить нужное правило и проверить уравнение.',
      },
      history: {
        label: 'истории',
        answer: 'Рассмотреть события в контексте и подтвердить объяснение надежными источниками.',
      },
      computerscience: {
        label: 'информатике',
        answer: 'Проследить входные данные и шаги, затем проверить обычные и граничные случаи.',
      },
      other: {
        label: 'другому предмету',
        answer: 'Использовать основные идеи темы, последовательно выполнить шаги и проверить результат.',
      },
    },
    distractors: [
      'Угадать, не читая вопрос внимательно.',
      'Не учитывать правила и определения предмета.',
      'Не проверять рассуждения и результат.',
    ],
    explanation: 'Этот подход использует основные методы работы по {subject} и помогает проверить понимание темы «{topic}».',
  },
  uz: {
    trueFalse: ['To‘g‘ri', 'Noto‘g‘ri'],
    prompts: [
      '{subject} bo‘yicha {topic} mavzusini o‘rganishni nimadan boshlash ma’qul?',
      '{subject} bo‘yicha {topic} topshirig‘ini aniq yechish uchun qaysi yondashuv foydali?',
      '{subject} bo‘yicha {topic} mavzusini tushunganingizni qanday tekshirasiz?',
      '{subject} bo‘yicha {topic} mavzusiga oid javobni tanlashdan oldin nima qilish kerak?',
      '{subject} bo‘yicha {topic} mavzusini aniq tushuntirishga qaysi usul yordam beradi?',
      '{subject} bo‘yicha {topic} mavzusiga oid javobning yakuniy tekshiruvi qanday bo‘lishi kerak?',
      '{subject} bo‘yicha {topic} bilan ishlashda qaysi usulga tayanish kerak?',
      '{subject} bo‘yicha {topic} mavzusida odatiy xatolardan qanday saqlanish mumkin?',
      '{subject} bo‘yicha {topic} fikringizni nima bilan asoslash kerak?',
      '{subject} bo‘yicha fikrlash jarayonini qanday aniq tushuntirish mumkin?',
    ],
    subjects: {
      mathematics: {
        label: 'matematika',
        answer: 'Berilgan qiymatlarni aniqlash, mos qoidani tanlash va natijani tekshirish.',
      },
      english: {
        label: 'ingliz tili',
        answer: 'Matn mazmunini o‘qish, tegishli til qoidasini qo‘llash va gapni qayta tekshirish.',
      },
      physics: {
        label: 'fizika',
        answer: 'Berilgan kattaliklar va birliklarni yozish, mos qonunni tanlash va birliklarni tekshirish.',
      },
      biology: {
        label: 'biologiya',
        answer: 'Organizm yoki jarayonlarni aniqlash va ularning bog‘liqligini dalillar bilan tushuntirish.',
      },
      chemistry: {
        label: 'kimyo',
        answer: 'Modda va zarrachalarni aniqlash, tegishli qoidani qo‘llash va tenglamani tekshirish.',
      },
      history: {
        label: 'tarix',
        answer: 'Voqealarni davr kontekstida ko‘rib, izohni ishonchli dalillar bilan asoslash.',
      },
      computerscience: {
        label: 'informatika',
        answer: 'Kirish ma’lumotlari va qadamlarni kuzatib, odatiy hamda chegaraviy holatlarni sinash.',
      },
      other: {
        label: 'boshqa fan',
        answer: 'Mavzuning asosiy g‘oyalaridan foydalanib, qadamlarni bajarish va natijani tekshirish.',
      },
    },
    distractors: [
      'Savolni diqqat bilan o‘qimasdan taxmin qilish.',
      'Fan qoidalari va ta’riflarini e’tiborsiz qoldirish.',
      'Fikr yuritish va natijani tekshirmaslik.',
    ],
    explanation: 'Bu yondashuv {subject} bo‘yicha asosiy usullarni qo‘llab, {topic} yuzasidan fikringizni tekshiradi.',
  },
};

const LANGUAGE_NAMES = {
  en: 'English',
  ru: 'Russian',
  uz: 'Uzbek',
};

const normalizeLanguage = (language) => (
  Object.hasOwn(QUESTION_COPY, language) ? language : 'en'
);

/**
 * Validate a single generated question object.
 * Returns true if valid, false otherwise.
 */
export function validateQuestion(q, { subject, topic, difficulty, language = 'en' }) {
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
    const labels = QUESTION_COPY[normalizeLanguage(language)].trueFalse.map((value) => value.toLowerCase());
    if (!Array.isArray(q.options) || q.options.length !== 2) return false;
    const cleanOpts = q.options.map((o) => o.trim().toLowerCase());
    if (!labels.every((label) => cleanOpts.includes(label))) return false;
    const cleanCorrect = q.correctAnswer.trim().toLowerCase();
    if (!labels.includes(cleanCorrect)) return false;
  }

  return true;
}

/**
 * Generate questions for a given subject, topic, and difficulty.
 * Searches database cache first, generating new ones via OpenAI only on cache miss.
 */
export async function generateQuestions({ subject, topic, difficulty, count, language = 'en' }) {
  const normalizedSubject = normalizeTopic(subject);
  const normalizedTopic = normalizeTopic(topic);
  const normalizedDiff = (difficulty || 'medium').toLowerCase();
  const normalizedLanguage = normalizeLanguage(language);

  // 1. Check existing questions in database (cached question bank)
  let existing = await PracticeQuestion.find({
    subject: normalizedSubject,
    topic: normalizedTopic,
    difficulty: normalizedDiff,
    language: normalizedLanguage,
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
      language: normalizedLanguage,
    });

    if (generated && generated.length > 0) {
      // Validate and insert
      const validQuestions = generated.filter((q) =>
        validateQuestion(q, {
          subject: normalizedSubject,
          topic: normalizedTopic,
          difficulty: normalizedDiff,
          language: normalizedLanguage,
        })
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
            language: normalizedLanguage,
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
async function generateFromAI({ subject, topic, difficulty, count, language }) {
  const apiKey = getApiKey();
  if (shouldUseMockAI(apiKey)) {
    return getMockQuestions(subject, topic, difficulty, count, language);
  }

  const copy = QUESTION_COPY[normalizeLanguage(language)];
  const prompt = `Generate exactly ${count} educational questions for a practice session.
Parameters:
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Language: ${LANGUAGE_NAMES[normalizeLanguage(language)]}. Write every question, option, correct answer, and explanation in that language.

Required output JSON schema structure:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "short_answer",
      "question": "concise and clear question content",
      "options": ["option 1", "option 2", "option 3", "option 4"], // only for multiple_choice or true_false. For true_false, use exactly ${JSON.stringify(copy.trueFalse)}. Leave empty for short_answer.
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
export function getMockQuestions(subject, topic, difficulty, count, language = 'en') {
  const lang = normalizeLanguage(language);
  const copy = QUESTION_COPY[lang];
  const subjectKey = String(subject).toLowerCase().replace(/[^a-z]/g, '');
  const subjectCopy = copy.subjects[subjectKey] || copy.subjects.other;

  return Array.from({ length: count }, (_, index) => {
    const prompt = copy.prompts[index % copy.prompts.length];
    const correctAnswer = subjectCopy.answer;
    const options = [correctAnswer, ...copy.distractors];
    const offset = index % options.length;
    const shuffledOptions = [...options.slice(offset), ...options.slice(0, offset)];

    return {
      type: 'multiple_choice',
      question: prompt
        .replaceAll('{topic}', topic)
        .replaceAll('{subject}', subjectCopy.label),
      options: shuffledOptions,
      correctAnswer,
      explanation: copy.explanation
        .replaceAll('{subject}', subjectCopy.label)
        .replaceAll('{topic}', topic),
      difficulty,
      language: lang,
    };
  });
}
