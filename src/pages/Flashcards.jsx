import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  Trash2,
  Search,
  BookOpen,
  ArrowRight,
  Flame,
} from 'lucide-react';
import Button from '../components/ui/Button';
import LoadingScreen from '../components/ui/LoadingScreen';
import { getDecks, createDeck, deleteDeck, generateDeckAI } from '../services/flashcardService';
import { useAuth } from '../context/AuthContext';

export default function Flashcards() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Manual Deck Form State
  const [newDeck, setNewDeck] = useState({
    title: '',
    subject: '',
    description: '',
    cards: [{ front: '', back: '', hint: '' }],
  });
  const [savingDeck, setSavingDeck] = useState(false);

  // AI Gen Form State
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiNotes, setAiNotes] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const data = await getDecks();
      setDecks(data);
    } catch (err) {
      setError(err.message || 'Failed to load flashcard decks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    try {
      await deleteDeck(id);
      setDecks((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(err.message || 'Error deleting deck');
    }
  };

  const handleAddCardRow = () => {
    setNewDeck((prev) => ({
      ...prev,
      cards: [...prev.cards, { front: '', back: '', hint: '' }],
    }));
  };

  const handleRemoveCardRow = (index) => {
    setNewDeck((prev) => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index),
    }));
  };

  const handleCardChange = (index, field, value) => {
    setNewDeck((prev) => {
      const updated = [...prev.cards];
      updated[index][field] = value;
      return { ...prev, cards: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newDeck.title.trim() || !newDeck.subject.trim()) {
      alert('Please fill in title and subject.');
      return;
    }
    const validCards = newDeck.cards.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      alert('Please add at least one valid flashcard (front and back).');
      return;
    }

    try {
      setSavingDeck(true);
      const created = await createDeck({
        ...newDeck,
        cards: validCards,
      });
      setShowCreateModal(false);
      setNewDeck({
        title: '',
        subject: '',
        description: '',
        cards: [{ front: '', back: '', hint: '' }],
      });
      fetchDecks();
    } catch (err) {
      alert(err.message || 'Failed to create deck');
    } finally {
      setSavingDeck(false);
    }
  };

  const handleAiGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!aiTopic.trim() && !aiNotes.trim()) {
      alert('Please enter a topic or paste notes for AI generation.');
      return;
    }

    try {
      setAiGenerating(true);
      await generateDeckAI({
        topic: aiTopic,
        subject: aiSubject || (user?.subjects && user.subjects[0]) || 'General',
        count: aiCount,
        notesText: aiNotes,
        saveImmediately: true,
      });
      setShowAiModal(false);
      setAiTopic('');
      setAiNotes('');
      fetchDecks();
    } catch (err) {
      alert(err.message || 'Failed to generate flashcards');
    } finally {
      setAiGenerating(false);
    }
  };

  const filteredDecks = decks.filter((deck) => {
    const matchesSearch =
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || deck.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const allSubjects = Array.from(new Set(decks.map((d) => d.subject))).filter(Boolean);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Layers className="w-5 h-5" />
            <span>{t('flashcards.title')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {t('flashcards.title')}
          </h1>
          <p className="text-muted text-sm mt-1">
            {t('flashcards.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>{t('flashcards.generateAI')}</span>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('flashcards.createDeck')}</span>
          </Button>
        </div>
      </div>

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-subtle rounded-xl text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedSubject === 'all'
                ? 'bg-primary text-white'
                : 'bg-card text-muted hover:text-text border border-subtle'
            }`}
          >
            All Subjects
          </button>
          {allSubjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedSubject === subj
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted hover:text-text border border-subtle'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="bg-card border border-subtle rounded-2xl p-12 text-center max-w-lg mx-auto mt-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">
            {t('flashcards.noDecks')}
          </h3>
          <p className="text-sm text-muted mb-6">
            Create your first custom deck or generate smart flashcards instantly with AI.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowAiModal(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-accent" />
              AI Generate
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Deck
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <Link
              key={deck._id}
              to={`/flashcards/${deck._id}`}
              className="group bg-card border border-subtle hover:border-primary/50 transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                    {deck.subject}
                  </span>
                  <button
                    onClick={(e) => handleDelete(deck._id, e)}
                    className="text-muted hover:text-danger p-1 rounded-lg hover:bg-white/5 transition-colors"
                    title="Delete Deck"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-text group-hover:text-primary transition-colors mb-1.5 line-clamp-1">
                  {deck.title}
                </h3>
                <p className="text-sm text-muted line-clamp-2 mb-4">
                  {deck.description || 'Spaced repetition flashcards.'}
                </p>
              </div>

              <div className="border-t border-subtle/60 pt-4 mt-2">
                <div className="flex items-center justify-between text-xs text-muted mb-4">
                  <span className="flex items-center gap-1.5 font-medium text-text">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {deck.totalCards} cards
                  </span>
                  {deck.dueCardsCount > 0 ? (
                    <span className="flex items-center gap-1 text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {deck.dueCardsCount} due
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      All reviewed
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>{t('flashcards.studyNow')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Manual Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-subtle flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">Create Flashcard Deck</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-text text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Deck Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JavaScript Async & Promises"
                    value={newDeck.title}
                    onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={newDeck.subject}
                    onChange={(e) => setNewDeck({ ...newDeck, subject: e.target.value })}
                    className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short description of this deck"
                  value={newDeck.description}
                  onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>

              {/* Cards List */}
              <div className="pt-2 border-t border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-text">Flashcards ({newDeck.cards.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddCardRow}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Card
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {newDeck.cards.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-dark/60 border border-subtle rounded-xl space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted">Card #{idx + 1}</span>
                        {newDeck.cards.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCardRow(idx)}
                            className="text-danger hover:text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Front (Question / Term) *"
                        value={card.front}
                        onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                        className="w-full px-3 py-1.5 bg-card border border-subtle rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                      />
                      <textarea
                        rows={2}
                        placeholder="Back (Answer / Definition) *"
                        value={card.back}
                        onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                        className="w-full px-3 py-1.5 bg-card border border-subtle rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-subtle">
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingDeck}>
                  {savingDeck ? 'Creating...' : 'Save Deck'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card border border-subtle rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-lg">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>AI Flashcard Generator</span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-muted hover:text-text text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAiGenerateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Topic or Concept *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mitochondria & Cellular Respiration or React Hooks"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Biology"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Card Count</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
                  >
                    <option value={5}>5 Cards</option>
                    <option value={10}>10 Cards</option>
                    <option value={15}>15 Cards</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Or Paste Lecture / Notes (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste lecture text, notes or summary to extract cards from..."
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark border border-subtle rounded-xl text-xs text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-subtle">
                <Button variant="secondary" type="button" onClick={() => setShowAiModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={aiGenerating}>
                  {aiGenerating ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-accent" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Flashcards'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
