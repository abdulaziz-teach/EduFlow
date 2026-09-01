import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function QuestionCard({ question, currentNumber, totalQuestions, submitting, onSubmit, isAnswered }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [shortAnswerText, setShortAnswerText] = useState('');

  // Reset inputs on question switch
  useEffect(() => {
    setSelectedOption('');
    setShortAnswerText('');
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.type === 'short_answer') {
      if (!shortAnswerText.trim()) return;
      onSubmit(shortAnswerText.trim());
    } else {
      if (!selectedOption) return;
      onSubmit(selectedOption);
    }
  };

  const isSubmitDisabled = () => {
    if (submitting || isAnswered) return true;
    if (question.type === 'short_answer') {
      return !shortAnswerText.trim();
    }
    return !selectedOption;
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 space-y-5 font-sans select-none">
      
      {/* Progress header indicator */}
      <div className="flex justify-between items-center text-xs text-muted">
        <span className="font-semibold uppercase tracking-wider text-primary">Question {currentNumber} of {totalQuestions}</span>
        <span className="capitalize px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">{question.difficulty}</span>
      </div>

      {/* Question Text */}
      <h4 className="text-base md:text-lg font-bold text-text leading-relaxed">
        {question.question}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Render Inputs dynamically based on type */}
        
        {question.type === 'multiple_choice' && (
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => setSelectedOption(opt)}
                className={`w-full p-4 rounded-xl border text-left text-sm font-semibold transition-all cursor-pointer ${
                  selectedOption === opt
                    ? 'bg-primary/10 border-primary text-primary shadow shadow-primary/10'
                    : 'border-white/5 bg-white/[0.01] text-text hover:bg-white/[0.03]'
                } disabled:opacity-50`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isAnswered}
                onClick={() => setSelectedOption(opt)}
                className={`py-4 rounded-xl border text-center text-sm font-bold transition-all cursor-pointer ${
                  selectedOption === opt
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-white/5 bg-white/[0.01] text-text hover:bg-white/[0.03]'
                } disabled:opacity-50`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'short_answer' && (
          <div className="space-y-2">
            <input
              type="text"
              disabled={isAnswered}
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-text text-sm focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Submit action */}
        {!isAnswered && (
          <div className="flex justify-end pt-2 border-t border-white/5">
            <button
              type="submit"
              disabled={isSubmitDisabled()}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Answer
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default QuestionCard;
