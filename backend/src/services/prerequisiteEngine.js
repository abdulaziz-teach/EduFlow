import UserTopicMastery from '../models/UserTopicMastery.js';
import { getPrerequisitesForTopic, normalizeTopicName } from './taxonomyService.js';

const MINIMUM_PREREQUISITE_MASTERY = 0.50;

/**
 * Check if the learner satisfies prerequisites for a topic
 * Includes cycle detection to prevent infinite recursive loops.
 */
export async function checkPrerequisites(userId, topicName, subject = '', visited = new Set()) {
  const normTopic = normalizeTopicName(topicName);

  // Prevent cycle loops
  if (visited.has(normTopic)) {
    return {
      satisfied: true,
      blockingPrerequisite: null,
      reason: 'Circular prerequisite dependency detected; bypassed safely.',
    };
  }
  visited.add(normTopic);

  const directPrereqs = getPrerequisitesForTopic(normTopic, subject);
  if (!directPrereqs || directPrereqs.length === 0) {
    return {
      satisfied: true,
      prerequisites: [],
      blockingPrerequisite: null,
      reason: `No prerequisites required for "${normTopic}".`,
    };
  }

  const evaluatedPrereqs = [];

  for (const prereqName of directPrereqs) {
    const normPrereq = normalizeTopicName(prereqName);

    // Fetch learner mastery record for this prerequisite
    const mastery = await UserTopicMastery.findOne({
      userId,
      topic: normPrereq,
    });

    const score = mastery ? mastery.knowledgeScore : 0;
    const status = mastery ? mastery.status : 'unstarted';
    const isSatisfied = score >= MINIMUM_PREREQUISITE_MASTERY;

    evaluatedPrereqs.push({
      topic: normPrereq,
      knowledgeScore: score,
      status,
      satisfied: isSatisfied,
    });

    // If direct prerequisite is below threshold, learner is blocked
    if (!isSatisfied) {
      return {
        satisfied: false,
        prerequisites: evaluatedPrereqs,
        blockingPrerequisite: {
          topic: normPrereq,
          knowledgeScore: score,
          status,
        },
        reason: `Reviewing foundational prerequisite "${normPrereq}" first is recommended because your current estimated score is ${(score * 100).toFixed(0)}%.`,
      };
    }

    // Recursively check indirect prerequisites
    const deeperCheck = await checkPrerequisites(userId, normPrereq, subject, new Set(visited));
    if (!deeperCheck.satisfied && deeperCheck.blockingPrerequisite) {
      return deeperCheck;
    }
  }

  return {
    satisfied: true,
    prerequisites: evaluatedPrereqs,
    blockingPrerequisite: null,
    reason: `All prerequisites for "${normTopic}" are sufficiently understood.`,
  };
}

export default {
  checkPrerequisites,
};
