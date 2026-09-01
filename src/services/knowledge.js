import api from './api';

export const getKnowledgeSummary = () => api.get('/knowledge/summary');
export const getKnowledgeSubjects = () => api.get('/knowledge/subjects');
export const getKnowledgeRecommendations = () => api.get('/knowledge/recommendations');
export const getKnowledgeTopic = (id) => api.get(`/knowledge/topics/${id}`);

const knowledgeService = {
  getSummary: getKnowledgeSummary,
  getSubjects: getKnowledgeSubjects,
  getRecommendations: getKnowledgeRecommendations,
  getTopic: getKnowledgeTopic,
};

export default knowledgeService;
