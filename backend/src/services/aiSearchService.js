import OpenAI from 'openai';
import { normalizeQuery, tokenizeQuery } from './searchRelevanceService.js';

let _openai;
function getClient() {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key || key.includes('your_openai') || key.includes('dev_')) {
    return null;
  }
  if (!_openai) {
    _openai = new OpenAI({ apiKey: key, timeout: 5000, maxRetries: 1 });
  }
  return _openai;
}

/**
 * Deterministic heuristic query understanding parser
 * Fast (<1ms), offline-compatible, and 100% reliable.
 */
export function parseQueryHeuristic(rawQuery = '') {
  const norm = normalizeQuery(rawQuery);
  const lower = norm.toLowerCase();

  let level = null;
  if (/\b(beginner|intro|introductory|starter|basics|fundamental|fundamentals|easy)\b/i.test(lower)) {
    level = 'beginner';
  } else if (/\b(intermediate|medium|moderate)\b/i.test(lower)) {
    level = 'intermediate';
  } else if (/\b(advanced|expert|mastery|hard|deep dive)\b/i.test(lower)) {
    level = 'advanced';
  }

  let intent = 'discovery';
  if (/\b(quiz|test|exam|assessment)\b/i.test(lower)) {
    intent = 'quiz';
  } else if (/\b(flashcard|card|cards|deck|memo|spaced repetition)\b/i.test(lower)) {
    intent = 'flashcard';
  } else if (/\b(lesson|lecture|video|tutorial)\b/i.test(lower)) {
    intent = 'lesson';
  } else if (/\b(course|learn|curriculum|study)\b/i.test(lower)) {
    intent = 'course';
  }

  // Extract clean domain keywords (remove conversational filler)
  const cleanedKeywords = lower
    .replace(/\b(i want to learn|how to learn|looking for|teach me|can you show me|from beginner level|for beginners|at intermediate level|advanced)\b/gi, '')
    .trim();

  return {
    isNaturalLanguage: lower.length > 20 || /\b(i want|how to|teach me|looking for)\b/i.test(lower),
    level,
    intent,
    cleanedKeywords: cleanedKeywords || norm,
    originalQuery: rawQuery,
  };
}

/**
 * AI-powered semantic query expansion and intent detection
 */
export async function understandSearchQuery(rawQuery = '') {
  const heuristic = parseQueryHeuristic(rawQuery);

  // If not conversational or OpenAI client is unavailable, return heuristic immediately
  const client = getClient();
  if (!heuristic.isNaturalLanguage || !client) {
    return heuristic;
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an educational search intent extractor. Given a student query, extract:
- domain: the core academic or technical subject (e.g. "backend development", "data structures")
- level: "beginner", "intermediate", "advanced", or null
- intent: "course", "lesson", "quiz", "flashcard", or "general"
- searchKeywords: array of 2-4 optimal search keywords
Return ONLY a valid JSON object matching these fields.`,
        },
        {
          role: 'user',
          content: rawQuery,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return {
      isNaturalLanguage: true,
      domain: parsed.domain || heuristic.cleanedKeywords,
      level: parsed.level || heuristic.level,
      intent: parsed.intent || heuristic.intent,
      searchKeywords: parsed.searchKeywords || [heuristic.cleanedKeywords],
      cleanedKeywords: parsed.domain || heuristic.cleanedKeywords,
      originalQuery: rawQuery,
    };
  } catch (_err) {
    // Fall back to robust heuristic on any upstream AI timeout or failure
    return heuristic;
  }
}

export default {
  parseQueryHeuristic,
  understandSearchQuery,
};
