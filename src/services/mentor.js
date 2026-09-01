import api from './api.js';

export const sendMessage = (conversationId, message, subject) =>
  api.post('/mentor/chat', { conversationId, message, subject });

export const getConversations = () =>
  api.get('/mentor/conversations');

export const getConversation = (id) =>
  api.get(`/mentor/conversations/${id}`);

export const deleteConversation = (id) =>
  api.delete(`/mentor/conversations/${id}`);

const mentorService = {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
};

export default mentorService;
