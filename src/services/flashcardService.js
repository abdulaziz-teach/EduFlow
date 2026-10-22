import api from './api';

const LOCAL_DECKS_KEY = 'eduflow_flashcard_decks';

function getFallbackDecks() {
  const stored = localStorage.getItem(LOCAL_DECKS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  const decks = [
    {
      _id: 'deck_1',
      title: 'JavaScript Asosiy Savollar',
      subject: 'Computer Science',
      cardCount: 5,
      cards: [
        { _id: 'c1', question: 'typeof null nimaga teng?', answer: '"object" (JavaScript-dagi tarixiy xatolik tufayli)' },
        { _id: 'c2', question: 'Closure nima?', answer: 'Ichki funksiyaning tashqi funksiya o\'zgaruvchilariga kirish imkoniyati.' },
        { _id: 'c3', question: 'Promise holatlari qaysilar?', answer: 'Pending, Fulfilled, Rejected.' },
        { _id: 'c4', question: 'Event Loop vazifasi nima?', answer: 'Call Stack va Callback Queue-ni muvofiqlashtirish.' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'deck_2',
      title: 'Matematik Formulalar & Teoremalar',
      subject: 'Mathematics',
      cardCount: 4,
      cards: [
        { _id: 'm1', question: 'Pifagor teoremasi', answer: 'a² + b² = c²' },
        { _id: 'm2', question: 'Hosilaning geometrik ma\'nosi', answer: 'Urinmaning burchak koeffitsiyenti (k = tg α = f\'(x₀))' },
        { _id: 'm3', question: 'sin²(x) + cos²(x)', answer: '1 ga teng' },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
  } catch (e) {
    // ignore
  }

  return decks;
}

export async function getDecks() {
  try {
    const data = await api.get('/flashcards');
    return data.decks || [];
  } catch (err) {
    return getFallbackDecks();
  }
}

export async function getDeckById(id) {
  try {
    return await api.get(`/flashcards/${id}`);
  } catch (err) {
    const decks = getFallbackDecks();
    const deck = decks.find((d) => d._id === id) || decks[0];
    return { success: true, deck };
  }
}

export async function createDeck(deckData) {
  try {
    const data = await api.post('/flashcards', deckData);
    return data.deck;
  } catch (err) {
    const decks = getFallbackDecks();
    const newDeck = {
      _id: 'deck_' + Date.now(),
      ...deckData,
      cardCount: deckData.cards ? deckData.cards.length : 0,
      createdAt: new Date().toISOString(),
    };
    decks.unshift(newDeck);
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
    return newDeck;
  }
}

export async function updateDeck(id, deckData) {
  try {
    const data = await api.put(`/flashcards/${id}`, deckData);
    return data.deck;
  } catch (err) {
    const decks = getFallbackDecks();
    const idx = decks.findIndex((d) => d._id === id);
    if (idx !== -1) {
      decks[idx] = { ...decks[idx], ...deckData };
      localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
      return decks[idx];
    }
    return deckData;
  }
}

export async function deleteDeck(id) {
  try {
    return await api.delete(`/flashcards/${id}`);
  } catch (err) {
    let decks = getFallbackDecks();
    decks = decks.filter((d) => d._id !== id);
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
    return { success: true };
  }
}

export async function generateDeckAI(payload) {
  try {
    return await api.post('/flashcards/generate', payload);
  } catch (err) {
    return {
      success: true,
      deck: {
        _id: 'deck_' + Date.now(),
        title: `${payload.topic || 'Yangi mavzu'} Flashcards`,
        cards: [
          { _id: 'card_1', question: `${payload.topic} nima?`, answer: 'Asosiy fundamental ta\'rif va tushuncha.' },
          { _id: 'card_2', question: 'Qayerda qo\'llaniladi?', answer: 'Real amaliy masalalarni yechishda.' },
        ],
      },
    };
  }
}

export async function submitCardReview(deckId, cardId, rating) {
  try {
    return await api.post(`/flashcards/${deckId}/cards/${cardId}/review`, { rating });
  } catch (err) {
    return { success: true, nextReview: new Date().toISOString() };
  }
}
