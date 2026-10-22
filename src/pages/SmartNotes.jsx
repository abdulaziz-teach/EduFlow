import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Layers,
  CheckCircle2,
  Printer,
  BookOpen,
  HelpCircle,
  Zap,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { summarizeNotes, convertAnalysisToDeck } from '../services/smartNoteService';
import { useAuth } from '../context/AuthContext';

export default function SmartNotes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notesContent, setNotesContent] = useState('');
  const [subject, setSubject] = useState(
    (user?.subjects && user.subjects[0]) || 'Computer Science'
  );
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [savingDeck, setSavingDeck] = useState(false);
  const [savedDeckMsg, setSavedDeckMsg] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!notesContent.trim() || notesContent.trim().length < 20) {
      alert('Please enter at least 20 characters of study notes to analyze.');
      return;
    }

    try {
      setLoading(true);
      setSavedDeckMsg(null);
      const result = await summarizeNotes({
        content: notesContent,
        subject,
        title: title || `${subject} Notes`,
      });
      setAnalysis(result);
    } catch (err) {
      alert(err.message || 'Failed to analyze notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeck = async () => {
    if (!analysis || !analysis.flashcards || analysis.flashcards.length === 0) return;

    try {
      setSavingDeck(true);
      const res = await convertAnalysisToDeck({
        title: analysis.title || `${subject} Flashcards`,
        subject: subject || 'General',
        cards: analysis.flashcards,
      });
      setSavedDeckMsg('Flashcards successfully saved to your Decks! 🎉');
    } catch (err) {
      alert(err.message || 'Error saving flashcard deck');
    } finally {
      setSavingDeck(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const loadSampleNotes = () => {
    setTitle('Neural Networks & Deep Learning Basics');
    setSubject('Computer Science');
    setNotesContent(`Artificial Neural Networks (ANNs) are computational models inspired by biological neural networks. 
A standard neural network consists of an input layer, one or more hidden layers, and an output layer.
Each node (neuron) applies a linear combination of weights (W) and biases (b), followed by a non-linear activation function f(z) = a.
Common activation functions include:
1. ReLU (Rectified Linear Unit): f(x) = max(0, x) - solves vanishing gradient problems in hidden layers.
2. Sigmoid: f(x) = 1 / (1 + e^-x) - used for binary classification output probabilities.
3. Softmax: Normalizes outputs into a probability distribution for multi-class classification.

During training, Forward Propagation computes predictions and loss. Backpropagation uses the Chain Rule of calculus to calculate gradients of the loss function with respect to every weight.
The weights are updated using Gradient Descent: W := W - alpha * dL/dW, where alpha is the learning rate.
Overfitting is mitigated using Regularization (L1, L2), Dropout, and Data Augmentation.`);
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-subtle pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>{t('smartNotes.title')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {t('smartNotes.title')}
          </h1>
          <p className="text-muted text-sm mt-1">
            {t('smartNotes.subtitle')}
          </p>
        </div>

        <button
          onClick={loadSampleNotes}
          className="text-xs text-primary font-semibold hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 self-start sm:self-auto"
        >
          Load Sample Notes
        </button>
      </div>

      {/* Input Section */}
      <div className="bg-card border border-subtle rounded-3xl p-6 sm:p-8 mb-8 shadow-xl print:hidden">
        <form onSubmit={handleSummarize} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                {t('smartNotes.titleLabel')}
              </label>
              <input
                type="text"
                placeholder="e.g. Chapter 4: Photosynthesis & Calvin Cycle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                {t('smartNotes.subjectLabel')}
              </label>
              <input
                type="text"
                placeholder="e.g. Biology, History, Physics..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark border border-subtle rounded-xl text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Study Notes / Lecture Transcript / Book Excerpt *
            </label>
            <textarea
              rows={6}
              required
              placeholder={t('smartNotes.inputPlaceholder')}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="w-full p-4 bg-dark border border-subtle rounded-2xl text-sm text-text focus:outline-none focus:border-primary resize-y font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={loading} className="px-8 flex items-center gap-2">
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-accent" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-accent fill-current" />
                  <span>{t('smartNotes.summarizeBtn')}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Analysis Results View */}
      {analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 print:hidden">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>AI Analysis & Study Materials Ready</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{t('smartNotes.printCheatsheet')}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDeck}
                disabled={savingDeck}
                className="flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>{savingDeck ? 'Saving...' : t('smartNotes.saveAsDeck')}</span>
              </Button>
            </div>
          </div>

          {savedDeckMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between print:hidden">
              <span>{savedDeckMsg}</span>
              <Button to="/flashcards" size="sm" variant="secondary">
                View Flashcards
              </Button>
            </div>
          )}

          {/* Printable Cheatsheet Container */}
          <div className="bg-card border border-subtle rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl print:bg-white print:text-black print:p-0 print:border-none">
            {/* Title & Subject */}
            <div className="border-b border-subtle pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {subject} • Cheatsheet
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text print:text-black mt-1">
                {analysis.title}
              </h2>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-bold text-text print:text-black flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span>{t('smartNotes.summaryTitle')}</span>
              </h3>
              <p className="text-text/90 print:text-black text-sm sm:text-base leading-relaxed bg-dark/40 print:bg-gray-100 p-5 rounded-2xl border border-subtle print:border-gray-300">
                {analysis.summary}
              </p>
            </div>

            {/* Key Takeaways */}
            {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text print:text-black flex items-center gap-2 mb-3">
                  <Bookmark className="w-5 h-5 text-accent" />
                  <span>{t('smartNotes.keyTakeaways')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.keyTakeaways.map((point, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-dark/40 print:bg-gray-100 rounded-2xl border border-subtle print:border-gray-300 text-sm text-text/90 print:text-black flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulas / Rules */}
            {analysis.formulasOrRules && analysis.formulasOrRules.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text print:text-black flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>{t('smartNotes.formulas')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.formulasOrRules.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-amber-500/5 print:bg-gray-100 border border-amber-500/20 print:border-gray-300 rounded-2xl"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 print:text-amber-800 mb-1">
                        {item.name}
                      </h4>
                      <code className="text-sm font-mono text-text print:text-black block bg-dark/60 print:bg-white p-2 rounded-lg border border-subtle print:border-gray-300">
                        {item.value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions */}
            {analysis.suggestedQuestions && analysis.suggestedQuestions.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text print:text-black flex items-center gap-2 mb-3">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                  <span>{t('smartNotes.practiceQuestions')}</span>
                </h3>
                <div className="space-y-3">
                  {analysis.suggestedQuestions.map((q, idx) => {
                    const isExp = expandedQuestion === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-dark/40 print:bg-gray-100 border border-subtle print:border-gray-300 rounded-2xl p-4 transition-all"
                      >
                        <div
                          onClick={() => setExpandedQuestion(isExp ? null : idx)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <span className="text-sm font-bold text-text print:text-black">
                            Q{idx + 1}: {q.question}
                          </span>
                          <button className="text-muted hover:text-text print:hidden">
                            {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                        {(isExp || true) && (
                          <div className={`mt-3 pt-3 border-t border-subtle/60 text-xs text-text/80 print:text-black leading-relaxed ${!isExp ? 'hidden print:block' : ''}`}>
                            <strong>Answer:</strong> {q.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flashcards Preview */}
            {analysis.flashcards && analysis.flashcards.length > 0 && (
              <div className="print:hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <span>{t('smartNotes.flashcards')} ({analysis.flashcards.length})</span>
                  </h3>
                  <Button size="sm" onClick={handleSaveDeck} disabled={savingDeck}>
                    {t('smartNotes.saveAsDeck')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.flashcards.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-dark/50 border border-subtle rounded-2xl flex flex-col justify-between"
                    >
                      <p className="text-xs font-bold text-text mb-2">
                        {card.front}
                      </p>
                      <p className="text-xs text-muted border-t border-subtle/40 pt-2">
                        {card.back}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
