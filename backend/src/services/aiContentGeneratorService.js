import OpenAI from 'openai';
import AIUsageLog from '../models/AIUsageLog.js';
import Lesson from '../models/Lesson.js';
import Course from '../models/Course.js';
import { extractTopicsFromContent } from './taxonomyService.js';
import { shouldUseMockAI } from '../utils/aiConfig.js';

let _openai;
function getApiKey() {
  return process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
}

function getClient() {
  if (!_openai) {
    const key = getApiKey();
    if (!key) {
      throw new Error('AI_API_KEY or OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({
      apiKey: key,
      timeout: 25000,
      maxRetries: 2,
    });
  }
  return _openai;
}

/**
 * Generate a complete, structured course curriculum
 */
export async function generateCourseStructureAI({
  subject,
  title,
  targetLevel = 'beginner',
  language = 'en',
  objectives = [],
  approximateModules = 3,
}) {
  const apiKey = getApiKey();

  // Mock / deterministic fallback if OpenAI is not configured or in dev
  if (shouldUseMockAI(apiKey)) {
    const cleanSubject = subject || 'Computer Science';
    const cleanTitle = title || ('Mastering ' + cleanSubject);
    return {
      title: cleanTitle,
      description: 'Comprehensive ' + targetLevel + ' course designed to build deep mastery of ' + cleanSubject + ' through practical lessons and targeted assessments.',
      category: cleanSubject,
      level: targetLevel,
      language,
      topics: [cleanSubject, 'Fundamentals', 'Application'],
      prerequisites: targetLevel === 'beginner' ? [] : ['Basic foundations of ' + cleanSubject],
      modules: [
        {
          title: 'Module 1: Foundations of ' + cleanSubject,
          description: 'Core concepts, syntax, and foundational problem solving.',
          lessons: [
            { title: 'Introduction & Core Concepts', duration: 600, order: 1 },
            { title: 'Working with Variables & Structures', duration: 900, order: 2 },
          ],
          quizTitle: cleanSubject + ' Foundations Quiz',
        },
        {
          title: 'Module 2: Practical Applications in ' + cleanSubject,
          description: 'Real-world problem solving, common design patterns, and case studies.',
          lessons: [
            { title: 'Algorithmic Problem Solving', duration: 1200, order: 3 },
            { title: 'System Architecture & Best Practices', duration: 1500, order: 4 },
          ],
          quizTitle: cleanSubject + ' Applications Quiz',
        },
      ],
    };
  }

  const prompt = [
    'Generate a structured course curriculum.',
    'Subject: ' + subject,
    'Title: ' + (title || ('Mastery of ' + subject)),
    'Target Level: ' + targetLevel,
    'Language: ' + language,
    'Objectives: ' + (Array.isArray(objectives) ? objectives.join(', ') : 'Comprehensive mastery'),
    'Modules count: ' + approximateModules,
    '',
    'Return strictly valid JSON with this format:',
    '{',
    '   title: Course Title,',
    '  description: 2-3 sentence overview,',
    '  category:  + subject + ,',
    '  level:  + targetLevel + ,',
    '  language:  + language + ,',
    '  topics: [topic1, topic2],',
    '  prerequisites: [prereq1],',
    '  modules: [',
    '    {',
    '      title: Module 1 Title,',
    '      description: Module summary,',
    '      lessons: [',
    '        { title: Lesson 1 Title, duration: 600, order: 1 }',
    '      ],',
    '      quizTitle: Quiz Title',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert curriculum designer. Always output valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
  return parsed;
}

/**
 * Generate draft lesson with structured sections
 */
export async function generateDraftLessonAI({
  title,
  topic,
  targetLevel = 'beginner',
  language = 'en',
  objectives = [],
  groundingContent = '',
}) {
  const apiKey = getApiKey();
  const cleanTitle = title || 'Understanding Core Principles';
  const cleanTopic = topic || 'Core Fundamentals';

  if (shouldUseMockAI(apiKey)) {
    return {
      title: cleanTitle,
      description: 'In-depth exploration of ' + cleanTopic + ', focusing on real-world application and conceptual mastery.',
      objectives: objectives.length > 0 ? objectives : [
        'Understand the fundamental definition and purpose of ' + cleanTopic + '.',
        'Apply core rules and patterns to solve typical problems.',
        'Identify common pitfalls and prevent errors.',
      ],
      explanation: 'At its core, ' + cleanTopic + ' provides a structured mechanism to solve problems reliably. Understanding how state, logic, and evaluation interact is essential for deeper fluency in this domain.',
      examples: [
        {
          title: 'Standard Implementation',
          codeOrSnippet: '// Example demonstrating standard usage\nconst item = calculateValue();',
          explanation: 'Demonstrates clean initialization and safe handling of variables.',
        },
      ],
      keyConcepts: [
        'Deterministic execution model',
        'State encapsulation and flow',
        'Error isolation and boundaries',
      ],
      practice: [
        {
          task: 'Explain in your own words the primary role of ' + cleanTopic + '.',
          guidance: 'Focus on the relationship between inputs and resulting side effects.',
        },
      ],
      summary: cleanTopic + ' establishes the foundational bedrock for building robust, scalable solutions. Continuous review ensures solid retention.',
      duration: 900,
      topics: [cleanTopic],
    };
  }

  const prompt = [
    'Generate a structured lesson draft.',
    'Title: ' + cleanTitle,
    'Topic: ' + cleanTopic,
    'Level: ' + targetLevel,
    'Language: ' + language,
    'Grounding Context:',
    groundingContent.substring(0, 3500),
    '',
    'Return strictly valid JSON with this format:',
    '{',
    '  title:  + cleanTitle + ,',
    '  description: Short summary,',
    '  objectives: [obj1, obj2, obj3],',
    '  explanation: Detailed high quality explanation with multiple paragraphs,',
    '  examples: [',
    '    { title: Example title, codeOrSnippet: snippet, explanation: description }',
    '  ],',
    '  keyConcepts: [concept1, concept2],',
    '  practice: [',
    '    { task: Task description, guidance: Helpful clue }',
    '  ],',
    '  summary: Crisp conclusion,',
    '  duration: 900,',
    '  topics: [ + cleanTopic + ]',
    '}',
  ].join('\n');

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert pedagogical instructor. Output valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

/**
 * Generate draft quiz questions
 */
export async function generateDraftQuizAI({
  title,
  topic = 'General',
  difficulty = 'medium',
  count = 3,
  groundingContent = '',
}) {
  const safeCount = Math.max(1, Math.min(10, parseInt(count, 10) || 3));
  const apiKey = getApiKey();

  if (shouldUseMockAI(apiKey)) {
    const questions = [];
    for (let i = 1; i <= safeCount; i++) {
      questions.push({
        question: 'Question ' + i + ': Which statement correctly describes the primary mechanism in ' + topic + '?',
        options: [
          'Foundational principle ' + i + ': Structured execution and safe boundaries.',
          'Incorrect option A: Random unverified mutations.',
          'Incorrect option B: Skipping prerequisite validation.',
          'Incorrect option C: Undefined side-effects.',
        ],
        correctAnswer: 'Foundational principle ' + i + ': Structured execution and safe boundaries.',
        explanation: 'This option correctly represents the standard core behavior required when working with ' + topic + '.',
        topic,
        difficulty,
        points: 1,
      });
    }

    return {
      title: title || (topic + ' Assessment'),
      description: 'Evaluates foundational understanding and problem-solving readiness in ' + topic + '.',
      passingScore: 70,
      questions,
    };
  }

  const prompt = [
    'Generate ' + safeCount + ' quiz questions for topic  + topic + .',
    'Difficulty: ' + difficulty,
    'Grounding Context:',
    groundingContent.substring(0, 3500),
    '',
    'Return strictly valid JSON with this format:',
    '{',
    '  title:  + (title || (topic +  Quiz)) + ,',
    '  description: Quiz description,',
    '  passingScore: 70,',
    '  questions: [',
    '    {',
    '      question: Question text?,',
    '      options: [Option A, Option B, Option C, Option D],',
    '      correctAnswer: Exact matching string from options,',
    '      explanation: Clear pedagogical explanation,',
    '      topic:  + topic + ,',
    '      difficulty:  + difficulty + ,',
    '      points: 1',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an educational psychometrics expert. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

/**
 * Generate draft flashcards grounded in approved lesson content
 */
export async function generateDraftFlashcardsAI({
  topic = 'General',
  count = 5,
  groundingContent = '',
}) {
  const safeCount = Math.max(1, Math.min(20, parseInt(count, 10) || 5));
  const apiKey = getApiKey();

  if (shouldUseMockAI(apiKey)) {
    const cards = [];
    for (let i = 1; i <= safeCount; i++) {
      cards.push({
        front: 'What is Key Concept #' + i + ' of ' + topic + '?',
        back: 'Key Concept #' + i + ' defines the core relationship and operational rules required to apply ' + topic + ' reliably.',
        hint: 'Think of the foundation of ' + topic + '.',
        tags: [topic],
        difficulty: 'medium',
      });
    }
    return {
      title: topic + ' Flashcards',
      description: 'Core memory anchors for ' + topic + '.',
      subject: topic,
      cards,
    };
  }

  const prompt = [
    'Generate ' + safeCount + ' high quality educational flashcards for  + topic + .',
    'Grounding Content:',
    groundingContent.substring(0, 3500),
    '',
    'Format strictly as JSON:',
    '{',
    '  title:  + topic +  Flashcards,',
    '  description: Flashcard deck description,',
    '  subject:  + topic + ,',
    '  cards: [',
    '    {',
    '      front: Crisp prompt or question testing recall,',
    '      back: Clear concise definition or explanation,',
    '      hint: Short clue,',
    '      tags: [ + topic + ],',
    '      difficulty: medium',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert in active recall and spaced repetition. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

/**
 * Fine-grained section regeneration / refinement
 */
export async function regenerateSectionAI({
  sectionName = 'explanation',
  instruction = 'improve_clarity',
  currentContent = '',
  topic = 'General',
}) {
  const apiKey = getApiKey();

  if (shouldUseMockAI(apiKey)) {
    return {
      sectionName,
      instruction,
      refinedContent: '[Refined ' + sectionName + ']: ' + currentContent + '\n\nKey Improvement: Clear step-by-step breakdown added to reinforce fundamental concepts in ' + topic + '.',
    };
  }

  const prompt = [
    'Refine and improve the following educational ' + sectionName + '.',
    'Topic: ' + topic,
    'Instruction: ' + instruction,
    'Current Content:',
    currentContent.substring(0, 3000),
    '',
    'Return valid JSON with:',
    '{',
    '  sectionName:  + sectionName + ,',
    '  instruction:  + instruction + ,',
    '  refinedContent: The rewritten high-quality content',
    '}',
  ].join('\n');

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert textbook editor. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

export default {
  generateCourseStructureAI,
  generateDraftLessonAI,
  generateDraftQuizAI,
  generateDraftFlashcardsAI,
  regenerateSectionAI,
};
