import AIMemory from '../models/AIMemory.js';

/**
 * Get justified long-term educational memories for a user
 */
export async function getMemoriesForUser(userId) {
  return await AIMemory.find({ userId }).sort({ updatedAt: -1 }).limit(20);
}

/**
 * Record a justified educational learning memory
 */
export async function addMemory(userId, { category, concept, observation, confidence = 0.8, source = 'system_inference' }) {
  if (!concept || !observation || !category) {
    throw new Error('category, concept, and observation are required');
  }

  // Deduplicate: update existing memory for same concept & category
  const memory = await AIMemory.findOneAndUpdate(
    {
      userId,
      category,
      concept: concept.trim(),
    },
    {
      $set: {
        observation: observation.trim(),
        confidence,
        source,
        lastObservedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return memory;
}

/**
 * Delete a specific memory with ownership verification
 */
export async function deleteMemory(userId, memoryId) {
  const deleted = await AIMemory.findOneAndDelete({ _id: memoryId, userId });
  return !!deleted;
}

/**
 * Heuristically extract safe educational memories from chat exchanges
 * (Never stores sensitive PII, only educational goals, strengths, or weaknesses)
 */
export async function extractLearningMemoriesFromChat(userId, userMessage) {
  const text = userMessage.toLowerCase();

  // Explicit goal declaration
  if (text.includes('my goal is') || text.includes('i want to learn') || text.includes('i am preparing for')) {
    const goalMatch = userMessage.match(/(?:my goal is|i want to learn|i am preparing for)\s+([^.?!,]+)/i);
    if (goalMatch && goalMatch[1].trim().length > 3) {
      await addMemory(userId, {
        category: 'goal',
        concept: goalMatch[1].trim(),
        observation: `Student stated educational goal: "${goalMatch[1].trim()}"`,
        confidence: 0.9,
        source: 'user_statement',
      });
    }
  }

  // Explicit struggle/weakness declaration
  if (text.includes("i struggle with") || text.includes("i don't understand") || text.includes("always confuse")) {
    const struggleMatch = userMessage.match(/(?:i struggle with|i don't understand|always confuse)\s+([^.?!,]+)/i);
    if (struggleMatch && struggleMatch[1].trim().length > 3) {
      await addMemory(userId, {
        category: 'weakness',
        concept: struggleMatch[1].trim(),
        observation: `Student identified recurring difficulty with: "${struggleMatch[1].trim()}"`,
        confidence: 0.85,
        source: 'user_statement',
      });
    }
  }
}

export default {
  getMemoriesForUser,
  addMemory,
  deleteMemory,
  extractLearningMemoriesFromChat,
};
