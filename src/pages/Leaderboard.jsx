import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Medal,
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  Award,
  Crown,
  User,
} from 'lucide-react';
import LoadingScreen from '../components/ui/LoadingScreen';
import { getLeaderboard } from '../services/leaderboardService';
import { useAuth } from '../context/AuthContext';

// Safe extraction helper functions supporting backend structure, mock structure, and missing fields
export const getStudentName = (s) => {
  if (!s) return 'Talaba';
  return s.name || s.user?.name || s.displayName || s.username || 'Talaba';
};

export const getStudentXP = (s) => {
  if (!s) return 0;
  return s.xp ?? s.points ?? s.score ?? 0;
};

export const getStudentMinutes = (s) => {
  if (!s) return 0;
  if (typeof s.totalStudyMinutes === 'number') return s.totalStudyMinutes;
  if (typeof s.studyHours === 'number') return Math.round(s.studyHours * 60);
  return 0;
};

export const getStudentStreak = (s) => {
  if (!s) return 0;
  return s.streak ?? 0;
};

export const getStudentInitials = (s) => {
  const name = getStudentName(s);
  return (name || 'TA').trim().slice(0, 2).toUpperCase();
};

export default function Leaderboard() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getLeaderboard();
        const list = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
        setLeaderboard(list);

        // Normalize currentUserRank whether it's a number, an object, or null
        let userRank = null;
        if (typeof data?.currentUserRank === 'number') {
          const found = list.find((s) => s.rank === data.currentUserRank);
          userRank = found
            ? { ...found, rank: data.currentUserRank }
            : {
                rank: data.currentUserRank,
                name: currentUser?.displayName || currentUser?.name || 'Talaba',
                xp: 0,
                streak: 0,
                totalStudyMinutes: 0,
              };
        } else if (data?.currentUserRank && typeof data.currentUserRank === 'object') {
          userRank = data.currentUserRank;
        }
        setCurrentUserRank(userRank);
      } catch (err) {
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  if (loading) return <LoadingScreen />;

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 text-accent bg-accent/10 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <Trophy className="w-4 h-4" />
          <span>EduFlow Rankings</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
          {t('leaderboard.title')}
        </h1>
        <p className="text-muted text-sm sm:text-base mt-2">
          {t('leaderboard.subtitle')}
        </p>
      </div>

      {/* Current User Standings Bar */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-primary/20 via-card to-accent/20 border border-primary/40 rounded-3xl p-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/30">
              #{currentUserRank.rank || 1}
            </div>
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Your Current Standing
              </span>
              <h3 className="text-lg font-bold text-text">
                {getStudentName(currentUserRank)} (You)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 font-bold text-accent">
              <Sparkles className="w-4 h-4" />
              <span>{getStudentXP(currentUserRank)} XP</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Flame className="w-4 h-4" />
              <span>{getStudentStreak(currentUserRank)}d streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted font-medium">
              <Clock className="w-4 h-4" />
              <span>{getStudentMinutes(currentUserRank)} mins</span>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="order-2 md:order-1 bg-card border border-subtle rounded-3xl p-6 text-center flex flex-col items-center relative overflow-hidden group hover:border-slate-400/50 transition-all">
              <div className="w-16 h-16 rounded-full bg-slate-400/10 border-2 border-slate-400 flex items-center justify-center text-slate-300 font-bold text-xl mb-3 relative">
                🥈
                <span className="absolute -bottom-2 px-2 py-0.5 bg-slate-400 text-dark text-[10px] font-black rounded-full">
                  #2
                </span>
              </div>
              <h3 className="text-base font-bold text-text mb-1 truncate w-full">
                {getStudentName(top3[1])}
              </h3>
              <div className="flex items-center gap-1 text-accent font-extrabold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{getStudentXP(top3[1])} XP</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted border-t border-subtle pt-3 w-full justify-center">
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5" /> {getStudentStreak(top3[1])}d
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {getStudentMinutes(top3[1])}m
                </span>
              </div>
            </div>
          )}

          {/* 1st Place Champion */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 to-card border-2 border-amber-400/50 rounded-3xl p-8 text-center flex flex-col items-center relative overflow-hidden shadow-2xl shadow-amber-500/10 md:-translate-y-4">
              <Crown className="w-8 h-8 text-amber-400 animate-bounce mb-1" />
              <div className="w-20 h-20 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-bold text-2xl mb-3 relative">
                🥇
                <span className="absolute -bottom-2 px-2.5 py-0.5 bg-amber-400 text-dark text-xs font-black rounded-full">
                  #1
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-text mb-1 truncate w-full">
                {getStudentName(top3[0])}
              </h3>
              <div className="flex items-center gap-1 text-accent font-black text-lg mb-3">
                <Sparkles className="w-5 h-5" />
                <span>{getStudentXP(top3[0])} XP</span>
              </div>
              <div className="flex items-center gap-5 text-xs text-muted border-t border-amber-500/20 pt-4 w-full justify-center">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Flame className="w-4 h-4" /> {getStudentStreak(top3[0])}d streak
                </span>
                <span className="flex items-center gap-1 font-semibold text-text">
                  <Clock className="w-4 h-4 text-primary" /> {getStudentMinutes(top3[0])}m
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="order-3 bg-card border border-subtle rounded-3xl p-6 text-center flex flex-col items-center relative overflow-hidden group hover:border-amber-700/50 transition-all">
              <div className="w-16 h-16 rounded-full bg-amber-700/10 border-2 border-amber-700 flex items-center justify-center text-amber-600 font-bold text-xl mb-3 relative">
                🥉
                <span className="absolute -bottom-2 px-2 py-0.5 bg-amber-700 text-white text-[10px] font-black rounded-full">
                  #3
                </span>
              </div>
              <h3 className="text-base font-bold text-text mb-1 truncate w-full">
                {getStudentName(top3[2])}
              </h3>
              <div className="flex items-center gap-1 text-accent font-extrabold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{getStudentXP(top3[2])} XP</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted border-t border-subtle pt-3 w-full justify-center">
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5" /> {getStudentStreak(top3[2])}d
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {getStudentMinutes(top3[2])}m
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-card border border-subtle rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-subtle flex items-center justify-between">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span>All Learners</span>
          </h3>
          <span className="text-xs text-muted font-semibold">
            {leaderboard.length} active students
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-base font-semibold text-text">Hozircha reyting ma'lumotlari mavjud emas</p>
            <p className="text-xs text-muted mt-1">Darslarni boshlang va reytingda birinchi bo'ling!</p>
          </div>
        ) : (
          <div className="divide-y divide-subtle">
            {leaderboard.map((student, idx) => {
              const studentName = getStudentName(student);
              const studentXP = getStudentXP(student);
              const studentMinutes = getStudentMinutes(student);
              const studentStreak = getStudentStreak(student);
              const studentInitials = getStudentInitials(student);
              const studentRank = student.rank ?? (idx + 1);
              const isCurrentUser = Boolean(
                student.isCurrentUser ||
                (currentUserRank && currentUserRank.id && student.id === currentUserRank.id) ||
                (currentUserRank && studentRank === currentUserRank.rank && !student.isCurrentUser && currentUserRank.isCurrentUser)
              );

              return (
                <div
                  key={student.id || student._id || `rank-${studentRank}-${idx}`}
                  className={`p-4 sm:px-6 flex items-center justify-between gap-4 transition-colors ${
                    isCurrentUser
                      ? 'bg-primary/10 font-bold'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Rank & Name */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`w-7 text-center text-sm font-black ${
                        studentRank === 1
                          ? 'text-amber-400'
                          : studentRank === 2
                          ? 'text-slate-300'
                          : studentRank === 3
                          ? 'text-amber-600'
                          : 'text-muted'
                      }`}
                    >
                      #{studentRank}
                    </span>

                    <div className="w-9 h-9 rounded-xl bg-dark/60 border border-subtle flex items-center justify-center text-text font-bold text-xs uppercase shrink-0">
                      {studentInitials}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {studentName} {isCurrentUser && <span className="text-primary font-bold">(You)</span>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1 text-amber-400">
                          <Flame className="w-3 h-3" /> {studentStreak}d streak
                        </span>
                        <span>•</span>
                        <span>{studentMinutes} mins studied</span>
                      </div>
                    </div>
                  </div>

                  {/* XP Score */}
                  <div className="flex items-center gap-1.5 text-accent font-black text-sm shrink-0">
                    <Sparkles className="w-4 h-4" />
                    <span>{studentXP} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
