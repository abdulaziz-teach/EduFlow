import { useState, useRef, useEffect } from 'react';
import { Brain, User, Sparkles, RotateCcw, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../ui/SectionHeading';

function MentorShowcase() {
  const { t, i18n } = useTranslation();
  const chatBottomRef = useRef(null);

  // Suggested question IDs
  const followUpKeys = ['q1', 'q2', 'q3'];

  // Initial dialogue generator based on active language
  const getInitialMessages = () => [
    {
      role: 'student',
      message:
        i18n.language === 'uz'
          ? 'Kvadrat tenglamalarni tushuntirib bera olasizmi?'
          : i18n.language === 'ru'
          ? 'Можете объяснить квадратные уравнения?'
          : 'Can you explain quadratic equations?',
    },
    {
      role: 'mentor',
      message:
        i18n.language === 'uz'
          ? "Albatta! Eng asosiy tushunchadan boshlaymiz.\n\nKvadrat tenglama ax² + bx + c = 0 ko'rinishida bo'ladi (bu yerda a ≠ 0).\n\nAsosiy maqsad — tenglamani to'g'ri tenglikka aylantiruvchi x qiymatlarini (ildizlarni) topish.\n\nKeling, misol ko'ramiz: x² + 5x + 6 = 0"
          : i18n.language === 'ru'
          ? 'Конечно! Начнём с самых основ.\n\nКвадратное уравнение имеет вид ax² + bx + c = 0, где a, b и c — константы (a ≠ 0).\n\nГлавная идея — найти значения x, при которых равенство верно. Это корни уравнения.\n\nРазберём пример: x² + 5x + 6 = 0'
          : "Of course! Let's start with the basics.\n\nA quadratic equation has the form ax² + bx + c = 0, where a, b, and c are constants and a ≠ 0.\n\nThe key idea is that we're looking for values of x that make the equation true. These are called the roots or solutions.\n\nLet's work through an example: x² + 5x + 6 = 0",
    },
    {
      role: 'student',
      message:
        i18n.language === 'uz'
          ? 'Buni qanday yechamiz?'
          : i18n.language === 'ru'
          ? 'Как именно его решить?'
          : 'How do I solve that one?',
    },
    {
      role: 'mentor',
      message:
        i18n.language === 'uz'
          ? "Ajoyib savol! Ko'paytuvchilarga ajratamiz.\n\nKo'paytmasi 6 va yig'indisi 5 bo'lgan sonlar kerak: ular 2 va 3.\n\nDemak: (x + 2)(x + 3) = 0.\nYechimlar: x = -2 yoki x = -3!"
          : i18n.language === 'ru'
          ? 'Отличный вопрос! Разложим на множители.\n\nНужно найти два числа, произведение которых 6, а сумма 5. Это 2 и 3.\n\nПолучаем: (x + 2)(x + 3) = 0.\nКорни: x = -2 или x = -3!'
          : 'Great question! We can factor it.\n\nWe need two numbers that multiply to 6 and add to 5. Those numbers are 2 and 3.\n\nSo: (x + 2)(x + 3) = 0\n\nThis means x = -2 or x = -3. Those are your solutions!',
    },
  ];

  const [messages, setMessages] = useState(getInitialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [answeredKeys, setAnsweredKeys] = useState([]);

  // Reset when language changes
  useEffect(() => {
    setMessages(getInitialMessages());
    setAnsweredKeys([]);
    setIsTyping(false);
  }, [i18n.language]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSelectQuestion = (qKey) => {
    if (isTyping || answeredKeys.includes(qKey)) return;

    const questionText = t(`landing.mentorShowcase.dialogue.${qKey}`);
    const answerText = t(`landing.mentorShowcase.dialogue.a${qKey.slice(1)}`);

    // Add student question
    setMessages((prev) => [...prev, { role: 'student', message: questionText }]);
    setAnsweredKeys((prev) => [...prev, qKey]);
    setIsTyping(true);

    // Simulate mentor thinking/typing (450ms)
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'mentor', message: answerText }]);
      setIsTyping(false);
    }, 450);
  };

  const handleReset = () => {
    setMessages(getInitialMessages());
    setAnsweredKeys([]);
    setIsTyping(false);
  };

  return (
    <section id="mentor" className="relative py-16 md:py-24 border-t border-subtle overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          label={t('mentor.title') || 'AI Mentor'}
          title={t('landing.mentorShowcase.title')}
          description={t('landing.mentorShowcase.subtitle')}
          descriptionClassName="text-slate-300"
        />

        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-subtle bg-card overflow-hidden shadow-2xl shadow-black/20">
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-subtle flex items-center justify-between gap-3 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{t('mentor.title') || 'AI Mentor'}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium">Online</span>
                  </div>
                </div>
              </div>

              {/* Demo Badge & Reset Button */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-primary/10 text-indigo-300 border border-primary/20 px-2 py-0.5 rounded-md font-mono">
                  {t('landing.mentorShowcase.demoBadge')}
                </span>
                {answeredKeys.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={t('landing.mentorShowcase.resetChat')}
                    aria-label={t('landing.mentorShowcase.resetChat')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat messages viewport */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[440px] sm:max-h-[480px] overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[85%] ${
                      msg.role === 'student'
                        ? 'bg-primary/25 border border-primary/30 rounded-2xl rounded-tr-sm text-white'
                        : 'bg-white/[0.03] border border-subtle rounded-2xl rounded-tl-sm text-slate-200'
                    } px-4 py-3 shadow-sm`}
                  >
                    {msg.role === 'mentor' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-indigo-400 font-semibold">
                          {t('mentor.title') || 'AI Mentor'}
                        </span>
                      </div>
                    )}
                    {msg.role === 'student' && (
                      <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                        <span className="text-xs text-slate-300 font-medium">You</span>
                        <User className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    )}
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-subtle rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
                    <span className="ml-1 text-[11px] text-slate-300 font-mono">
                      {t('landing.mentorShowcase.typing')}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested follow-up interactive questions */}
            <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-subtle bg-black/10">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-slate-300 font-medium">
                    {t('landing.mentorShowcase.tryAsking')}
                  </span>
                </div>
                {answeredKeys.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('landing.mentorShowcase.resetChat')}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {followUpKeys.map((qKey) => {
                  const isAnswered = answeredKeys.includes(qKey);
                  return (
                    <button
                      key={qKey}
                      onClick={() => handleSelectQuestion(qKey)}
                      disabled={isAnswered || isTyping}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all cursor-pointer ${
                        isAnswered
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
                          : 'bg-white/[0.03] border-subtle text-slate-200 hover:text-white hover:border-primary/40 hover:bg-primary/10'
                      }`}
                    >
                      {t(`landing.mentorShowcase.dialogue.${qKey}`)}
                      {isAnswered && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input bar mockup (Honest: labels as demo mode to not deceive user) */}
            <div className="px-4 sm:px-5 pb-5">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-subtle bg-dark/60">
                <input
                  type="text"
                  placeholder={t('landing.mentorShowcase.inputPlaceholderDemo')}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-text placeholder:text-slate-400 outline-none cursor-not-allowed"
                  readOnly
                />
                <div
                  className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-slate-400"
                  title="Demo mode: click suggested topics above"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MentorShowcase;
