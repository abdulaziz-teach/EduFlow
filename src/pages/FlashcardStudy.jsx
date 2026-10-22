import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  RotateCw,
  Volume2,
  Sparkles,
  Trophy,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Flame,
} from 'lucide-react';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';
import { getDeckById, submitCardReview } from '../services/flashcardService';

export default function FlashcardStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    async function loadDeck() {
      try {
        setLoading(true);
        const data = await getDeckById(id);
        setDeck(data.deck);
      } catch (err) {
        setError(err.message || 'Failed to load deck');
      } finally {
        setLoading(false);
      }
    }
    loadDeck();
  }, [id]);

  const currentCard = deck?.cards?.[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleSpeak = (e, text) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleReview = useCallback(
    async (rating) => {
      if (!currentCard || submitting) return;

      try {
        setSubmitting(true);
        const res = await submitCardReview(deck._id, currentCard._id, rating);

        setXpEarned((prev) => prev + (res.xpGained || 5));
        setReviewedCount((prev) => prev + 1);

        setIsFlipped(false);
        setShowHint(false);

        if (currentIndex + 1 < deck.cards.length) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsCompleted(true);
        }
      } catch (err) {
        alert(err.message || 'Error saving review');
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, deck, currentIndex, submitting]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isCompleted) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleReview(1);
        if (e.key === '2') handleReview(2);
        if (e.key === '3') handleReview(3);
        if (e.key === '4') handleReview(4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isCompleted, handleFlip, handleReview]);

  if (loading) return <LoadingScreen />;

  if (error || !deck) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-xl font-bold text-text mb-2">Deck not found</h2>
        <p className="text-muted mb-4">{error || 'Unable to retrieve flashcard deck.'}</p>
        <Button to="/flashcards">Back to Decks</Button>
      </div>
    );
  }

  const totalCards = deck.cards.length;
  const progressPercent = Math.round(((currentIndex + (isCompleted ? 1 : 0)) / totalCards) * 100);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/flashcards"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Decks</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-lg">
              {deck.subject}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{xpEarned} XP</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted mb-2 font-medium">
            <span>{deck.title}</span>
            <span>
              Card {Math.min(currentIndex + 1, totalCards)} of {totalCards} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-subtle">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard View */}
      {isCompleted ? (
        <div className="bg-card border border-subtle rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-auto shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-accent">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-text mb-2">
            {t('flashcards.completedTitle')}
          </h2>
          <p className="text-muted text-sm mb-8">
            {t('flashcards.completedSubtitle')}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8 bg-dark/60 p-4 rounded-2xl border border-subtle">
            <div>
              <span className="block text-2xl font-bold text-text">{reviewedCount}</span>
              <span className="text-xs text-muted">Cards Reviewed</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-accent">+{xpEarned}</span>
              <span className="text-xs text-muted">XP Gained</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setIsCompleted(false);
              }}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Review Again
            </Button>
            <Button to="/flashcards">
              <Layers className="w-4 h-4 mr-2" />
              {t('flashcards.backToDecks')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="my-auto">
          {/* Card Component with Flip Animation */}
          <div
            onClick={handleFlip}
            className="cursor-pointer select-none perspective-1000 min-h-[340px] sm:min-h-[380px] w-full relative"
          >
            <div
              className={`w-full h-full min-h-[340px] sm:min-h-[380px] rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-500 transform-style-3d border shadow-xl ${
                isFlipped
                  ? 'bg-card/95 border-primary/40 shadow-primary/10 rotate-y-180'
                  : 'bg-card border-subtle hover:border-primary/30 shadow-black/20'
              }`}
            >
              {/* Card Top Details */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-muted">
                  {isFlipped ? 'Answer / Explanation' : 'Question / Concept'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) =>
                      handleSpeak(e, isFlipped ? currentCard.back : currentCard.front)
                    }
                    className="p-2 text-muted hover:text-primary rounded-lg hover:bg-white/5 transition-colors"
                    title="Read aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {currentCard.hint && !isFlipped && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="p-2 text-muted hover:text-accent rounded-lg hover:bg-white/5 transition-colors"
                      title="Show hint"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Center Content */}
              <div className="py-6 text-center flex flex-col items-center justify-center flex-1">
                {showHint && !isFlipped && (
                  <div className="mb-4 text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-xl border border-accent/20 max-w-md animate-in fade-in">
                    💡 <strong>Hint:</strong> {currentCard.hint}
                  </div>
                )}
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-text leading-relaxed max-w-2xl">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
              </div>

              {/* Card Bottom Prompt */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted/80">
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>
                  {isFlipped ? 'Select your recall rating below' : 'Click or Press Space to Flip'}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Controls (SM-2 Algorithm Buttons) */}
          <div className="mt-8">
            {isFlipped ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-3">
                <button
                  onClick={() => handleReview(1)}
                  disabled={submitting}
                  className="flex flex-col items-center py-3.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl transition-all group"
                >
                  <span className="text-sm font-bold">{t('flashcards.again')}</span>
                  <span className="text-[10px] text-red-400/80 mt-0.5">Key 1</span>
                </button>

                <button
                  onClick={() => handleReview(2)}
                  disabled={submitting}
                  className="flex flex-col items-center py-3.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl transition-all group"
                >
                  <span className="text-sm font-bold">{t('flashcards.hard')}</span>
                  <span className="text-[10px] text-amber-400/80 mt-0.5">Key 2</span>
                </button>

                <button
                  onClick={() => handleReview(3)}
                  disabled={submitting}
                  className="flex flex-col items-center py-3.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl transition-all group"
                >
                  <span className="text-sm font-bold">{t('flashcards.good')}</span>
                  <span className="text-[10px] text-emerald-400/80 mt-0.5">Key 3</span>
                </button>

                <button
                  onClick={() => handleReview(4)}
                  disabled={submitting}
                  className="flex flex-col items-center py-3.5 px-3 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-2xl transition-all group"
                >
                  <span className="text-sm font-bold">{t('flashcards.easy')}</span>
                  <span className="text-[10px] text-primary/80 mt-0.5">Key 4</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button onClick={handleFlip} size="lg" className="w-full sm:w-auto px-12">
                  <RotateCw className="w-4 h-4 mr-2" />
                  {t('flashcards.flipCard')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
