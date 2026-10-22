import api from './api.js';

export const sendMessage = (conversationId, message, subject, mode = 'explain', courseId = null, lessonId = null) =>
  api.post('/mentor/chat', { conversationId, message, subject, mode, courseId, lessonId });

export const submitFeedback = (messageId, helpful, reason = null, comment = '') =>
  api.post('/mentor/feedback', { messageId, helpful, reason, comment });

export const getConversations = () =>
  api.get('/mentor/conversations');

export const getConversation = (id) =>
  api.get(`/mentor/conversations/${id}`);

export const deleteConversation = (id) =>
  api.delete(`/mentor/conversations/${id}`);

const mentorService = {
  sendMessage,
  submitFeedback,
  getConversations,
  getConversation,
  deleteConversation,
};

export default mentorService;
