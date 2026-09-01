import KnowledgeTopic from '../models/KnowledgeTopic.js';
import KnowledgeEvent from '../models/KnowledgeEvent.js';

// Heuristic configuration weights
const SCORING_WEIGHTS = {
  practice: 15,     // study session completed
  completed: 10,    // task completed
  asked_help: -10,  // asked AI mentor
  correct: 15,
  incorrect: -5,
};

const DECAY_THRESHOLD_DAYS = 3;
const DECAY_PERCENT_PER_DAY = 5;

/**
 * Normalize topic string to prevent casing/spacing duplicates
 */
export function normalizeTopic(topicName) {
  if (!topicName) return 'General';
  return topicName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()); // Title Case
}

/**
 * Extract a clean topic name from a descriptive task title
 */
export function extractTopicFromTitle(title) {
  if (!title) return 'General';
  let topic = title.trim();

  // Strip common educational prefix verbs and structural nouns
  const prefixes = [
    /^(study|review|practice|solve|revise|complete|read|write|learn)\s+/i,
    /^(key concepts of|problems on|problems for|notes for|introduction to|basics of|principles of|concept of)\s+/i,
    /^(key concepts|practice problems|problems|questions|exercise)\s+/i,
  ];

  let cleaned = true;
  while (cleaned) {
    cleaned = false;
    for (const regex of prefixes) {
      if (regex.test(topic)) {
        topic = topic.replace(regex, '');
        cleaned = true;
      }
    }
  }

  topic = topic.trim();

  // Fallback to General if title is generic
  if (!topic || topic.length < 3 || /^(study|homework|task|assignment|exam|quiz)\b/i.test(topic)) {
    return 'General';
  }

  return normalizeTopic(topic);
}

/**
 * Log a new knowledge event and recalculate the associated topic state
 */
export async function logEvent(userId, subject, topicName, source, type, metadata = {}) {
  const normalizedSubject = normalizeTopic(subject);
  const normalizedTopic = normalizeTopic(topicName);

  // 1. Find or create the topic record
  let topic = await KnowledgeTopic.findOne({
    userId,
    subject: normalizedSubject,
    topic: normalizedTopic,
  });

  if (!topic) {
    topic = await KnowledgeTopic.create({
      userId,
      subject: normalizedSubject,
      topic: normalizedTopic,
      status: 'new',
      confidence: 0,
      practiceCount: 0,
    });
  }

  // 2. Create the knowledge event record
  await KnowledgeEvent.create({
    userId,
    topicId: topic._id,
    source,
    type,
    metadata,
  });

  // 3. Increment counters
  if (type === 'practice' || type === 'completed') {
    topic.practiceCount += 1;
    topic.lastPracticedAt = new Date();
  }
  if (type === 'completed' || type === 'correct') {
    topic.successfulActivities += 1;
  }

  await topic.save();

  // 4. Recalculate topic confidence and status
  return await recalculateTopicState(topic._id);
}

/**
 * Perform confidence scoring and recency decay updates
 */
export async function recalculateTopicState(topicId) {
  const topic = await KnowledgeTopic.findById(topicId);
  if (!topic) return null;

  // Retrieve all events for this topic
  const events = await KnowledgeEvent.find({ topicId: topic._id });

  // Compute confidence base score
  let score = 0;
  events.forEach((ev) => {
    const weight = SCORING_WEIGHTS[ev.type] || 0;
    score += weight;
  });

  // Apply recency decay if time has passed since last practice
  if (topic.lastPracticedAt) {
    const msDiff = Date.now() - new Date(topic.lastPracticedAt).getTime();
    const daysSincePractice = msDiff / (1000 * 60 * 60 * 24);

    if (daysSincePractice > DECAY_THRESHOLD_DAYS) {
      const decayDays = Math.floor(daysSincePractice - DECAY_THRESHOLD_DAYS);
      const decayAmount = decayDays * DECAY_PERCENT_PER_DAY;
      score -= decayAmount;
    }
  }

  // Clamp confidence score to 0 - 100
  const confidence = Math.max(0, Math.min(100, score));

  // Determine status category based on heuristics
  let status = 'new';
  if (topic.practiceCount > 0) {
    if (confidence >= 75 && topic.practiceCount >= 3) {
      status = 'strong';
    } else if (confidence < 45 && topic.practiceCount >= 2) {
      status = 'needs_review';
    } else {
      status = 'learning';
    }
  }

  topic.confidence = confidence;
  topic.status = status;
  await topic.save();

  return topic;
}

/**
 * Retrieve review recommendations for the user
 */
export async function getRecommendations(userId) {
  // Query topics marked as needs_review
  const topics = await KnowledgeTopic.find({ userId, status: 'needs_review' })
    .sort({ confidence: 1 })
    .limit(5);

  return topics.map((t) => ({
    id: t._id,
    topic: t.topic,
    subject: t.subject,
    confidence: t.confidence,
    reason: 'This topic could benefit from extra review practice.',
  }));
}

/**
 * Fetch knowledge tracker overall summary counts
 */
export async function getSummary(userId) {
  const topics = await KnowledgeTopic.find({ userId });

  const totalTopics = topics.length;
  const learningTopics = topics.filter((t) => t.status === 'learning').length;
  const needsReview = topics.filter((t) => t.status === 'needs_review').length;
  const strongTopics = topics.filter((t) => t.status === 'strong').length;

  return {
    totalTopics,
    learningTopics,
    needsReview,
    strongTopics,
  };
}

/**
 * Fetch knowledge subjects aggregates
 */
export async function getSubjectsBreakdown(userId) {
  const topics = await KnowledgeTopic.find({ userId }).sort({ confidence: -1 });

  const subjectMap = {};

  topics.forEach((t) => {
    if (!subjectMap[t.subject]) {
      subjectMap[t.subject] = {
        subject: t.subject,
        topics: 0,
        needsReview: 0,
        strong: 0,
        topicsList: [],
      };
    }
    subjectMap[t.subject].topics += 1;
    subjectMap[t.subject].topicsList.push(t);
    if (t.status === 'needs_review') {
      subjectMap[t.subject].needsReview += 1;
    }
    if (t.status === 'strong') {
      subjectMap[t.subject].strong += 1;
    }
  });

  return Object.values(subjectMap);
}
