/**
 * Curriculum Taxonomy & Prerequisite Relationships
 */
export const CURRICULUM_TAXONOMY = {
  Mathematics: {
    Fractions: {
      prerequisites: [],
      description: 'Foundations of numerator, denominator, and fractional arithmetic.',
    },
    Algebra: {
      prerequisites: ['Fractions'],
      description: 'Working with variables, algebraic expressions, and simplification.',
    },
    Equations: {
      prerequisites: ['Algebra'],
      description: 'Solving linear, quadratic, and simultaneous equations.',
    },
    Functions: {
      prerequisites: ['Equations'],
      description: 'Domain, range, function notation, and graphing.',
    },
    Derivatives: {
      prerequisites: ['Functions'],
      description: 'Limits, rate of change, power rule, and differential calculus.',
    },
  },
  'Computer Science': {
    'Variables & Types': {
      prerequisites: [],
      description: 'Primitive types, memory allocation, and value assignment.',
    },
    'Control Flow': {
      prerequisites: ['Variables & Types'],
      description: 'Conditionals, loops, and branching logic.',
    },
    'Functions & Scope': {
      prerequisites: ['Control Flow'],
      description: 'Parameters, return values, call stack, and variable scope.',
    },
    'Data Structures': {
      prerequisites: ['Functions & Scope'],
      description: 'Arrays, linked lists, stacks, queues, and hash maps.',
    },
    Algorithms: {
      prerequisites: ['Data Structures'],
      description: 'Searching, sorting, recursion, and time complexity analysis.',
    },
  },
  Biology: {
    'Cell Structure': {
      prerequisites: [],
      description: 'Organelles, cell membranes, and eukaryotic/prokaryotic cells.',
    },
    Photosynthesis: {
      prerequisites: ['Cell Structure'],
      description: 'Chloroplasts, light-dependent reactions, and Calvin cycle.',
    },
    Genetics: {
      prerequisites: ['Cell Structure'],
      description: 'DNA, RNA, Mendelian inheritance, and gene expression.',
    },
  },
};

/**
 * Clean and normalize a topic name string
 */
export function normalizeTopicName(topic) {
  if (!topic || typeof topic !== 'string') return 'General';
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()); // Title Case
}

/**
 * Get prerequisites defined for a given topic and subject
 */
export function getPrerequisitesForTopic(topicName, subject = '') {
  const normTopic = normalizeTopicName(topicName);
  const normSubject = subject ? normalizeTopicName(subject) : '';

  // 1. Direct match in subject taxonomy
  if (normSubject && CURRICULUM_TAXONOMY[normSubject]?.[normTopic]) {
    return CURRICULUM_TAXONOMY[normSubject][normTopic].prerequisites;
  }

  // 2. Search all subjects
  for (const s of Object.keys(CURRICULUM_TAXONOMY)) {
    if (CURRICULUM_TAXONOMY[s][normTopic]) {
      return CURRICULUM_TAXONOMY[s][normTopic].prerequisites;
    }
  }

  return [];
}

/**
 * Extract associated topics from course, lesson, quiz, or text
 */
export function extractTopicsFromContent({ lesson, course, quiz, flashcard, topic, subject }) {
  const extracted = new Set();

  if (topic) {
    extracted.add(normalizeTopicName(topic));
  }

  if (lesson) {
    if (Array.isArray(lesson.topics) && lesson.topics.length > 0) {
      lesson.topics.forEach((t) => extracted.add(normalizeTopicName(t)));
    } else if (lesson.title) {
      extracted.add(normalizeTopicName(lesson.title));
    }
  }

  if (course) {
    if (Array.isArray(course.topics) && course.topics.length > 0) {
      course.topics.forEach((t) => extracted.add(normalizeTopicName(t)));
    }
  }

  if (quiz) {
    if (quiz.title) {
      extracted.add(normalizeTopicName(quiz.title.replace(/quiz/i, '').trim() || 'Quiz Concepts'));
    }
  }

  if (flashcard) {
    if (Array.isArray(flashcard.tags)) {
      flashcard.tags.forEach((tag) => extracted.add(normalizeTopicName(tag)));
    }
  }

  if (extracted.size === 0) {
    extracted.add(normalizeTopicName(subject || 'General'));
  }

  return Array.from(extracted);
}

export default {
  CURRICULUM_TAXONOMY,
  normalizeTopicName,
  getPrerequisitesForTopic,
  extractTopicsFromContent,
};
