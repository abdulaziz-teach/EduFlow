import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function AnswerFeedback({ feedback, onNext, isLast }) {
  const { i18n } = useTranslation();
  if (!feedback) return null;

  const { correct, correctAnswer, explanation } = feedback;
  const isUz = i18n.language === 'uz';
  const isRu = i18n.language === 'ru';

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-5 md:p-6 space-y-4 font-sans select-none animate-fade-in shadow-xl transition-all ${
        correct
          ? 'border-emerald-500/40 bg-emerald-500/10 shadow-emerald-500/10'
          : 'border-rose-500/40 bg-rose-500/10 shadow-rose-500/10'
      }`}
    >
      {/* Top Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {correct ? (
            <>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-base md:text-lg font-bold text-emerald-400">
                  {isUz ? "To‘g‘ri javob! Barakalla! 🎉" : isRu ? "Правильный ответ! Отлично! 🎉" : "Correct Answer! Great Job! 🎉"}
                </h4>
                <p className="text-xs text-emerald-300/80">
                  {isUz ? "Savolga muvaffaqiyatli javob berdingiz." : isRu ? "Вы успешно ответили на вопрос." : "You answered the question correctly."}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-base md:text-lg font-bold text-rose-400">
                  {isUz ? "Noto‘g‘ri javob ❌" : isRu ? "Неправильный ответ ❌" : "Incorrect Answer ❌"}
                </h4>
                <p className="text-xs text-rose-300/80">
                  {isUz ? "Tushuntirish bilan tanishib chiqing:" : isRu ? "Ознакомьтесь с объяснением ниже:" : "Review the explanation below:"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onNext}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-bold rounded-xl text-white transition-all shadow-md cursor-pointer shrink-0 self-end sm:self-auto ${
            correct
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
          }`}
        >
          {isLast
            ? (isUz ? "Mashqni yakunlash" : isRu ? "Завершить практику" : "Finish Practice")
            : (isUz ? "Keyingi savolga o‘tish" : isRu ? "Следующий вопрос" : "Next Question")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Correct answer text if wrong */}
      {!correct && correctAnswer && (
        <div className="text-sm bg-black/30 p-3.5 rounded-xl border border-rose-500/20">
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider block mb-1">
            {isUz ? "To‘g‘ri javob:" : isRu ? "Правильный ответ:" : "Correct Answer:"}
          </span>
          <span className="font-bold text-emerald-400 text-sm md:text-base">{correctAnswer}</span>
        </div>
      )}

      {/* Explanation text */}
      {explanation && (
        <div className="space-y-1.5 bg-black/30 p-3.5 rounded-xl border border-white/5">
          <span className="text-xs font-bold text-muted uppercase tracking-wider block">
            {isUz ? "💡 Tushuntirish:" : isRu ? "💡 Объяснение:" : "💡 Explanation:"}
          </span>
          <p className="text-xs md:text-sm text-text/90 leading-relaxed font-sans text-left">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default AnswerFeedback;
