import { Brain, User, Sparkles } from 'lucide-react';
import SectionHeading from '../ui/SectionHeading';

const conversation = [
  {
    role: 'student',
    message: 'Can you explain quadratic equations?',
  },
  {
    role: 'mentor',
    message:
      "Of course! Let's start with the basics.\n\nA quadratic equation has the form ax² + bx + c = 0, where a, b, and c are constants and a ≠ 0.\n\nThe key idea is that we're looking for values of x that make the equation true. These are called the roots or solutions.\n\nLet's work through an example: x² + 5x + 6 = 0",
  },
  {
    role: 'student',
    message: 'How do I solve that one?',
  },
  {
    role: 'mentor',
    message:
      "Great question! We can factor it.\n\nWe need two numbers that multiply to 6 and add to 5. Those numbers are 2 and 3.\n\nSo: (x + 2)(x + 3) = 0\n\nThis means x = -2 or x = -3. Those are your solutions!",
  },
];

const followUps = [
  'What is the quadratic formula?',
  'Show me another example',
  'When do I use completing the square?',
];

function MentorShowcase() {
  return (
    <section id="mentor" className="py-16 md:py-24 border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="AI Mentor"
          title="Like having a tutor available 24/7."
          description="Ask questions, get step-by-step explanations, and build real understanding."
        />

        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-subtle bg-card overflow-hidden shadow-2xl shadow-black/20">
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-subtle flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">AI Mentor</p>
                <p className="text-xs text-emerald-400">Online</p>
              </div>
            </div>

            {/* Chat messages */}
            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              {conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'student'
                        ? 'bg-primary/15 border border-primary/20 rounded-xl rounded-br-sm'
                        : 'bg-white/[0.04] border border-subtle rounded-xl rounded-bl-sm'
                    } px-4 py-3`}
                  >
                    {msg.role === 'mentor' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3 h-3 text-primary" />
                        <span className="text-[11px] text-primary font-medium">AI Mentor</span>
                      </div>
                    )}
                    {msg.role === 'student' && (
                      <div className="flex items-center gap-1.5 mb-2 justify-end">
                        <span className="text-[11px] text-muted font-medium">You</span>
                        <User className="w-3 h-3 text-muted" />
                      </div>
                    )}
                    <p className="text-sm text-text/90 leading-relaxed whitespace-pre-line">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested follow-ups */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[11px] text-muted font-medium">Suggested follow-ups</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {followUps.map((q) => (
                  <button
                    key={q}
                    className="px-3 py-1.5 text-xs text-muted border border-subtle rounded-full hover:text-text hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input bar */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-subtle bg-dark/50">
                <input
                  type="text"
                  placeholder="Ask your AI Mentor..."
                  className="flex-1 bg-transparent text-sm text-text placeholder:text-muted/50 outline-none"
                  readOnly
                />
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
