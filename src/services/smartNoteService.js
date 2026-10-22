import api from './api';

export async function summarizeNotes(payload) {
  const data = await api.post('/smart-notes/summarize', payload);
  return data.analysis;
}

export async function convertAnalysisToDeck(payload) {
  const data = await api.post('/smart-notes/convert-to-deck', payload);
  return data;
}
