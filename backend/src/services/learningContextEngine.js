import { getLearnerProfile } from './learnerProfileService.js';
import { getCourseGroundingContext } from './courseGroundingService.js';
import { getMemoriesForUser } from './aiMemoryService.js';
import { determineNextAction } from './nextActionEngine.js';

/**
 * Build targeted educational context for the AI prompt
 */
export async function buildLearningContext({ userId, userMessage, subject, courseId, lessonId }) {
  // 1. Fetch cached learner profile
  const profile = await getLearnerProfile(userId);

  // 2. Fetch course grounding context if applicable
  const grounding = await getCourseGroundingContext(userId, courseId, lessonId, userMessage);

  // 3. Fetch long-term educational memories
  const memories = await getMemoriesForUser(userId);

  // 4. Filter weak & strong topics relevant to the query or active subject
  const lowerMsg = (userMessage || '').toLowerCase();
  const targetSubject = (subject || '').toLowerCase();

  const relevantWeakTopics = (profile.weakTopics || []).filter((wt) => {
    const topicLower = wt.topic.toLowerCase();
    const subjLower = wt.subject.toLowerCase();
    return (
      lowerMsg.includes(topicLower) ||
      (targetSubject && subjLower.includes(targetSubject)) ||
      wt.confidence >= 0.7
    );
  }).slice(0, 3);

  const relevantStrongTopics = (profile.strongTopics || []).filter((st) => {
    const topicLower = st.topic.toLowerCase();
    return lowerMsg.includes(topicLower) || st.confidence >= 0.8;
  }).slice(0, 2);

  // 5. Compose concise context block
  const lines = ['Learner Educational Context:'];

  if (profile.learningGoals) {
    lines.push(`- Goal: ${profile.learningGoals}`);
  }
  lines.push(`- Preferred Difficulty: ${profile.preferredDifficulty || 'intermediate'}`);
  lines.push(`- Preferred Learning Style: ${profile.preferredLearningStyle || 'mixed'}`);

  if (relevantWeakTopics.length > 0) {
    const weakList = relevantWeakTopics
      .map((w) => `"${w.topic}" (struggles confirmed with ${(w.confidence * 100).toFixed(0)}% confidence)`)
      .join(', ');
    lines.push(`- Demonstrated Weaknesses: ${weakList}`);
    lines.push(`  Recommendation for Mentor: If answering questions in these topics, check prerequisites first and break explanations into simpler foundational steps.`);
  }

  if (relevantStrongTopics.length > 0) {
    const strongList = relevantStrongTopics.map((s) => `"${s.topic}"`).join(', ');
    lines.push(`- Demonstrated Strengths: ${strongList}`);
  }

  if (memories.length > 0) {
    const memoryLines = memories
      .slice(0, 3)
      .map((m) => `[${m.category.toUpperCase()}]: ${m.observation}`)
      .join('; ');
    lines.push(`- Long-Term Educational Memory: ${memoryLines}`);
  }

  // Include Next Best Action guidance
  try {
    const nextAction = await determineNextAction(userId);
    if (nextAction && nextAction.title) {
      lines.push(`- Current Next-Best-Action for Learner: ${nextAction.title} (${nextAction.subtitle || ''}). Reason: ${nextAction.reason}`);
    }
  } catch (nbaErr) {
    // Non-blocking
  }

  if (grounding.isGrounded && grounding.contextSnippet) {
    lines.push(`\n${grounding.contextSnippet}`);
  }

  return {
    contextString: lines.join('\n'),
    isGrounded: grounding.isGrounded,
    courseTitle: grounding.courseTitle,
    lessonTitle: grounding.lessonTitle,
    relevantWeakTopics: relevantWeakTopics.map((w) => w.topic),
  };
}

export default {
  buildLearningContext,
};
