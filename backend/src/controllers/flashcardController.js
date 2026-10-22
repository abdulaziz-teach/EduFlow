import FlashcardDeck from '../models/FlashcardDeck.js';
import Flashcard from '../models/Flashcard.js';
import FlashcardProgress from '../models/FlashcardProgress.js';
import User from '../models/User.js';
import { generateFlashcardsAI } from '../services/aiService.js';
import { calculateNextReview } from '../services/srsService.js';
import * as knowledgeUpdateEngine from '../services/knowledgeUpdateEngine.js';

/**
 * SuperMemo-2 Spaced Repetition calculation
 * @param {Object} card Current card state
 * @param {Number} rating 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 */
function calculateSM2(card, rating) {
  // Map 1-4 rating to SM-2 quality 1-5 scale: 1 -> 1, 2 -> 2, 3 -> 4, 4 -> 5
  const qualityMap = { 1: 1, 2: 2, 3: 4, 4: 5 };
  const q = qualityMap[rating] || 3;

  let easeFactor = card.easeFactor || 2.5;
  let repetitions = card.repetitions || 0;
  let interval = card.interval || 0;

  if (q >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Update Ease Factor (SM-2 formula)
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  let masteryLevel = 'learning';
  if (q < 3) {
    masteryLevel = 'learning';
  } else if (interval >= 21) {
    masteryLevel = 'mastered';
  } else if (interval >= 6) {
    masteryLevel = 'review';
  }

  const nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    interval,
    masteryLevel,
    nextReviewDate,
    lastReviewedAt: new Date(),
  };
}

/**
 * Get all decks for the authenticated user
 */
export async function getDecks(req, res, next) {
  try {
    const userId = req.user._id;
    const decks = await FlashcardDeck.find({ userId }).sort({ updatedAt: -1 });

    const now = new Date();
    const formatted = decks.map((deck) => {
      const dueCardsCount = deck.cards.filter(
        (c) => !c.nextReviewDate || new Date(c.nextReviewDate) <= now
      ).length;
      const masteredCount = deck.cards.filter((c) => c.masteryLevel === 'mastered').length;

      return {
        _id: deck._id,
        title: deck.title,
        description: deck.description,
        subject: deck.subject,
        tags: deck.tags,
        totalCards: deck.cards.length,
        dueCardsCount,
        masteredCount,
        totalReviews: deck.totalReviews || 0,
        updatedAt: deck.updatedAt,
      };
    });

    res.json({ success: true, decks: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single deck with its cards
 */
export async function getDeckById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const deck = await FlashcardDeck.findOne({ _id: id, userId });
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    }

    const now = new Date();
    const dueCards = deck.cards.filter(
      (c) => !c.nextReviewDate || new Date(c.nextReviewDate) <= now
    );

    res.json({
      success: true,
      deck,
      dueCount: dueCards.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new flashcard deck
 */
export async function createDeck(req, res, next) {
  try {
    const userId = req.user._id;
    const { title, description, subject, tags, cards } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, message: 'Title and subject are required' });
    }

    const formattedCards = (cards || []).map((c) => ({
      front: c.front,
      back: c.back,
      hint: c.hint || '',
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(),
      masteryLevel: 'new',
    }));

    const deck = await FlashcardDeck.create({
      userId,
      title,
      description: description || '',
      subject,
      tags: tags || [],
      cards: formattedCards,
    });

    res.status(201).json({ success: true, deck });
  } catch (err) {
    next(err);
  }
}

/**
 * AI generate flashcards and optionally save to deck
 */
export async function generateDeckWithAI(req, res, next) {
  try {
    const { topic, subject, count = 10, notesText, saveImmediately, title } = req.body;
    const userId = req.user._id;

    if (!topic && !subject && !notesText) {
      return res.status(400).json({ success: false, message: 'Topic, subject or notesText is required' });
    }

    const aiResult = await generateFlashcardsAI({
      topic,
      count: Number(count) || 10,
      subject: subject || 'General',
      notesText,
    });

    if (saveImmediately) {
      const formattedCards = (aiResult.cards || []).map((c) => ({
        front: c.front,
        back: c.back,
        hint: c.hint || '',
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
        masteryLevel: 'new',
      }));

      const deck = await FlashcardDeck.create({
        userId,
        title: title || aiResult.title || `${topic || subject} Deck`,
        description: aiResult.description || 'AI generated deck',
        subject: subject || 'General',
        tags: [subject, topic].filter(Boolean),
        cards: formattedCards,
      });

      return res.status(201).json({ success: true, deck });
    }

    res.json({ success: true, generated: aiResult });
  } catch (err) {
    next(err);
  }
}

/**
 * Review a single card inside a deck (SM-2 review submission)
 */
export async function reviewCard(req, res, next) {
  try {
    const { id, cardId } = req.params;
    const { rating } = req.body; // 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 4) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 4' });
    }

    const deck = await FlashcardDeck.findOne({ _id: id, userId });
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const card = deck.cards.id(cardId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found in deck' });
    }

    const sm2Update = calculateSM2(card, Number(rating));
    Object.assign(card, sm2Update);

    deck.totalReviews = (deck.totalReviews || 0) + 1;
    await deck.save();

    // Award XP to user (e.g. 5 XP per flashcard review)
    const xpReward = rating >= 3 ? 10 : 5;
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.xp': xpReward, 'stats.cardsReviewed': 1 },
    });

    // Trigger knowledge state update
    try {
      await knowledgeUpdateEngine.onFlashcardReviewed({
        userId,
        card,
        deck,
        rating: Number(rating),
        subject: deck.subject || 'General',
      });
    } catch (err) {
      console.error('Error in onFlashcardReviewed (deck):', err.message);
    }

    res.json({
      success: true,
      card,
      xpGained: xpReward,
      deckTotalReviews: deck.totalReviews,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update deck metadata or add/delete individual cards
 */
export async function updateDeck(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, description, subject, tags, cards } = req.body;

    const deck = await FlashcardDeck.findOne({ _id: id, userId });
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (title !== undefined) deck.title = title;
    if (description !== undefined) deck.description = description;
    if (subject !== undefined) deck.subject = subject;
    if (tags !== undefined) deck.tags = tags;
    if (Array.isArray(cards)) {
      deck.cards = cards;
    }

    await deck.save();
    res.json({ success: true, deck });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a deck
 */
export async function deleteDeck(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await FlashcardDeck.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    res.json({ success: true, message: 'Deck deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Review a standalone normalized flashcard using server-side SM-2
 */
export async function reviewStandaloneCard(req, res, next) {
  try {
    const { id: flashcardId } = req.params;
    const { rating } = req.body;
    const userId = req.user._id;

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 0 and 5' });
    }

    const card = await Flashcard.findById(flashcardId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }

    const currentProgress = await FlashcardProgress.findOne({ userId, flashcardId });
    const srsUpdate = calculateNextReview({
      rating: Number(rating),
      previousEaseFactor: currentProgress ? currentProgress.easeFactor : 2.5,
      previousInterval: currentProgress ? currentProgress.interval : 0,
      previousRepetitions: currentProgress ? currentProgress.repetitions : 0,
      previousLapses: currentProgress ? currentProgress.lapses : 0,
    });

    const updatedProgress = await FlashcardProgress.findOneAndUpdate(
      { userId, flashcardId },
      {
        ...srsUpdate,
        $setOnInsert: { userId, flashcardId },
      },
      { upsert: true, new: true }
    );

    // Trigger knowledge state update
    try {
      await knowledgeUpdateEngine.onFlashcardReviewed({
        userId,
        card,
        rating: Number(rating),
      });
    } catch (err) {
      console.error('Error in onFlashcardReviewed (standalone):', err.message);
    }

    res.json({
      success: true,
      card,
      progress: updatedProgress,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get flashcards due for review
 */
export async function getDueCards(req, res, next) {
  try {
    const userId = req.user._id;
    const now = new Date();

    const dueProgress = await FlashcardProgress.find({
      userId,
      dueAt: { $lte: now },
    })
      .populate('flashcardId')
      .sort({ dueAt: 1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      dueCards: dueProgress,
    });
  } catch (err) {
    next(err);
  }
}

