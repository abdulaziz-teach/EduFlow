import api from './api';

export const getKnowledgeSummary = async () => {
  try {
    return await api.get('/knowledge/summary');
  } catch {
    return {
      success: true,
      summary: {
        totalSubjects: 3,
        totalTopics: 12,
        masteredTopics: 5,
        reviewNeededTopics: 2,
      },
    };
  }
};

export const getKnowledgeSubjects = async () => {
  try {
    return await api.get('/knowledge/subjects');
  } catch {
    return {
      success: true,
      subjects: [
        { subject: 'English', totalTopics: 4, masteredCount: 2, needsReviewCount: 1 },
        { subject: 'Computer Science', totalTopics: 5, masteredCount: 2, needsReviewCount: 1 },
        { subject: 'Mathematics', totalTopics: 3, masteredCount: 1, needsReviewCount: 0 },
      ],
    };
  }
};

export const getKnowledgeRecommendations = async () => {
  try {
    return await api.get('/knowledge/recommendations');
  } catch {
    return {
      success: true,
      recommendations: [
        {
          subject: 'English',
          topicName: 'Past Perfect Continuous',
          reason: 'Scheduled for spaced repetition review',
        },
      ],
    };
  }
};

export const getKnowledgeTopic = async (id) => {
  try {
    return await api.get(`/knowledge/topics/${id}`);
  } catch {
    return {
      success: true,
      topic: { id, title: 'Topic Details', masteryScore: 75 },
    };
  }
};

const knowledgeService = {
  getSummary: getKnowledgeSummary,
  getSubjects: getKnowledgeSubjects,
  getRecommendations: getKnowledgeRecommendations,
  getTopic: getKnowledgeTopic,
};

export default knowledgeService;
