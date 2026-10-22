import api from './api';

export async function getDecks() {
  const data = await api.get('/flashcards');
  return data.decks || [];
}

export async function getDeckById(id) {
  const data = await api.get(`/flashcards/${id}`);
  return data;
}

export async function createDeck(deckData) {
  const data = await api.post('/flashcards', deckData);
  return data.deck;
}

export async function updateDeck(id, deckData) {
  const data = await api.put(`/flashcards/${id}`, deckData);
  return data.deck;
}

export async function deleteDeck(id) {
  const data = await api.delete(`/flashcards/${id}`);
  return data;
}

export async function generateDeckAI(payload) {
  const data = await api.post('/flashcards/generate', payload);
  return data;
}

export async function submitCardReview(deckId, cardId, rating) {
  const data = await api.post(`/flashcards/${deckId}/cards/${cardId}/review`, { rating });
  return data;
}
