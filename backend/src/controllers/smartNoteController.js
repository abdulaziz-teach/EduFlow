import FlashcardDeck from '../models/FlashcardDeck.js';
import { summarizeMaterialAI } from '../services/aiService.js';

/**
 * Summarize text/notes material using AI
 */
export async function summarizeContent(req, res, next) {
  try {
    const { content, subject, title } = req.body;

    if (!content || content.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 20 characters of study notes or text content to summarize.',
      });
    }

    const result = await summarizeMaterialAI({
      content,
      subject: subject || 'General',
      title: title || 'Study Notes',
    });

    res.json({
      success: true,
      analysis: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Convert analyzed flashcards from smart notes directly to user's saved Flashcard Deck
 */
export async function convertToDeck(req, res, next) {
  try {
    const userId = req.user._id;
    const { title, subject, cards } = req.body;

    if (!title || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Deck title and at least one card are required.',
      });
    }

    const formattedCards = cards.map((c) => ({
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
      description: `Created from Smart Notes analysis`,
      subject: subject || 'General',
      tags: ['smart-notes', subject].filter(Boolean),
      cards: formattedCards,
    });

    res.status(201).json({
      success: true,
      deck,
      message: 'Flashcards saved to your decks successfully!',
    });
  } catch (err) {
    next(err);
  }
}
