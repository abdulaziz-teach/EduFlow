import { Award, Lock } from 'lucide-react';

const ACHIEVEMENTS_LIST = [
  {
    key: 'first_study_session',
    title: 'First Study Session',
    desc: 'Take the first step and complete a study session.',
    icon: '📚',
  },
  {
    key: 'first_practice',
    title: 'First Practice',
    desc: 'Actively test your skills with a smart practice quiz set.',
    icon: '📝',
  },
  {
    key: '10_practice_questions',
    title: '10 Practice Questions',
    desc: 'Answer a total of 10 practice questions on any topic.',
    icon: '⚡',
  },
  {
    key: '5_completed_tasks',
    title: '5 Completed Tasks',
    desc: 'Complete 5 goals from your personalized study roadmap.',
    icon: '📅',
  },
  {
    key: '7_day_streak',
    title: '7-Day Study Streak',
    desc: 'Maintain a 7-day study session consistency streak.',
    icon: '🔥',
  },
];

function AchievementCard({ unlocked = [] }) {
  const getUnlockDetails = (key) => {
    return unlocked.find((item) => item.achievementKey === key);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4 font-sans select-none">
      <h3 className="text-sm font-bold text-text uppercase tracking-wider text-muted flex items-center gap-2">
        🏆 Learning Achievements
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ACHIEVEMENTS_LIST.map((ach) => {
          const unlock = getUnlockDetails(ach.key);

          return (
            <div
              key={ach.key}
              className={`rounded-2xl border p-4.5 flex gap-4 transition-all ${
                unlock
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-white/5 bg-[#111827]/40 opacity-60'
              }`}
            >
              {/* Icon badge */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl ${
                unlock ? 'bg-emerald-500/10' : 'bg-white/[0.02]'
              }`}>
                {unlock ? ach.icon : <Lock className="w-5 h-5 text-muted/50" />}
              </div>

              {/* Card info */}
              <div className="space-y-1 min-w-0">
                <h4 className={`text-sm font-bold ${unlock ? 'text-text' : 'text-muted'}`}>
                  {ach.title}
                </h4>
                <p className="text-xs text-muted text-left leading-relaxed">
                  {ach.desc}
                </p>
                {unlock && (
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                    Unlocked {formatDate(unlock.unlockedAt)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AchievementCard;
