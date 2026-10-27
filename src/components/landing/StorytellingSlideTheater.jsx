import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Brain,
  Sparkles,
  TrendingUp,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Target,
  Zap,
} from 'lucide-react';

const SLIDE_DURATION = 6000; // 6 seconds per slide
const PROGRESS_INTERVAL = 50; // update progress every 50ms

function SlidePlanPreview() {
  const tasks = [
    { time: '09:00 - 10:00', title: 'Calculus: Derivatives & Limits', tag: 'Mathematics', done: true },
    { time: '10:30 - 11:30', title: 'English: Analytical Essay Thesis', tag: 'Literature', done: true },
    { time: '13:00 - 14:15', title: 'Physics: Kinematics Problem Set', tag: 'Physics', done: false, active: true },
    { time: '15:00 - 15:45', title: 'Active Recall Review & Flashcards', tag: 'Revision', done: false },
  ];

  return (
    <div className="space-y-4">
      {/* Top action indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-text uppercase tracking-wider">
            Daily Adaptive Schedule
          </span>
        </div>
        <span className="text-xs text-muted font-mono bg-white/[0.04] px-2.5 py-1 rounded-md border border-subtle">
          3.5h planned today
        </span>
      </div>

      {/* Task list simulation */}
      <div className="space-y-2.5">
        {tasks.map((task, i) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              task.active
                ? 'bg-primary/10 border-primary/40 shadow-sm shadow-primary/10'
                : task.done
                ? 'bg-white/[0.02] border-subtle opacity-75'
                : 'bg-white/[0.02] border-subtle'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  task.done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : task.active
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'border border-subtle text-muted'
                }`}
              >
                {task.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <div className="min-w-0">
                <p className={`text-xs md:text-sm font-medium truncate ${task.done ? 'line-through text-muted' : 'text-text'}`}>
                  {task.title}
                </p>
                <span className="text-[10px] text-muted font-mono">{task.time}</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                task.active
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/[0.04] text-muted'
              }`}
            >
              {task.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between pt-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> 2 of 4 blocks mastered
        </span>
        <span className="text-muted/60">Updated 5m ago by AI</span>
      </div>
    </div>
  );
}

function SlideMentorPreview() {
  return (
    <div className="space-y-3.5">
      {/* Student Question */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/20 border border-primary/30 p-3.5 text-text">
          <p className="text-xs md:text-sm font-medium">
            "How do I derive the quadratic formula instead of just memorizing it?"
          </p>
          <span className="text-[10px] text-primary/80 mt-1 block text-right font-mono">10:42 AM</span>
        </div>
      </div>

      {/* Mentor Response */}
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-card/90 border border-subtle p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-subtle">
            <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
              <Brain className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-semibold text-text">EduFlow AI Mentor</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded ml-auto">
              Socratic Step 1
            </span>
          </div>

          <p className="text-xs md:text-sm text-text/90 leading-relaxed mb-2.5">
            Start from standard form: <code className="text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">ax² + bx + c = 0</code>.
            Divide through by <span className="text-primary font-medium">a</span>, then isolate the constants:
          </p>

          <div className="p-2.5 rounded-lg bg-black/40 border border-subtle font-mono text-[11px] md:text-xs text-indigo-200 mb-2.5">
            x² + (b/a)x = -c/a
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Now complete the square by adding <code className="text-emerald-400">(b/2a)²</code> to both sides. Notice how the left side folds cleanly into a square!
          </p>
        </div>
      </div>

      {/* Suggested Follow-up Chip */}
      <div className="flex items-center gap-2 pt-1">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] text-muted truncate">
          Suggested: "Show me the geometric square visualization"
        </span>
      </div>
    </div>
  );
}

function SlidePracticePreview() {
  const [selectedOption, setSelectedOption] = useState(1);

  const options = [
    { id: 0, text: 'Linear acceleration is always proportional to speed squared', correct: false },
    { id: 1, text: 'Net force equals rate of change of momentum (F = dp/dt)', correct: true },
    { id: 2, text: 'Energy is only conserved when friction is absent entirely', correct: false },
  ];

  return (
    <div className="space-y-3.5">
      {/* Quiz Card Header */}
      <div className="flex items-center justify-between pb-2 border-b border-subtle">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Active Recall Question 3 of 10
        </span>
        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
          Adaptive Difficulty: Level 4
        </span>
      </div>

      {/* Question */}
      <p className="text-xs md:text-sm font-medium text-text leading-snug">
        Which statement accurately expresses Newton's Second Law in general mechanics?
      </p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`w-full text-left p-3 rounded-xl border text-xs md:text-sm transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-white/[0.02] border-subtle text-muted hover:text-text hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono font-bold ${
                  isSelected ? 'bg-emerald-500 text-dark' : 'bg-white/[0.06] text-muted'
                }`}>
                  {String.fromCharCode(65 + opt.id)}
                </span>
                <span>{opt.text}</span>
              </div>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>

      {/* Instant Feedback Pill */}
      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>Correct! F = dp/dt accounts for systems with changing mass as well.</span>
      </div>
    </div>
  );
}

function SlideProgressPreview() {
  const subjects = [
    { name: 'Mathematics & Analysis', pct: 88, color: 'bg-primary' },
    { name: 'Classical Mechanics', pct: 76, color: 'bg-sky-400' },
    { name: 'English Composition', pct: 64, color: 'bg-emerald-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Top metrics grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-subtle text-center">
          <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-sm md:text-base font-bold text-text">6h 42m</p>
          <p className="text-[10px] text-muted">Weekly Focus</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-subtle text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-sm md:text-base font-bold text-text">5 Days</p>
          <p className="text-[10px] text-muted">Study Streak</p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-subtle text-center">
          <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-sm md:text-base font-bold text-text">92%</p>
          <p className="text-[10px] text-muted">Retention Rate</p>
        </div>
      </div>

      {/* Subject mastery progress bars */}
      <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-subtle">
        <div className="flex items-center justify-between text-xs text-text font-medium mb-1">
          <span>Subject Mastery Score</span>
          <span className="text-emerald-400 text-[11px]">+14% this month</span>
        </div>
        {subjects.map((s) => (
          <div key={s.name} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted">{s.name}</span>
              <span className="text-text font-mono font-medium">{s.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full ${s.color} transition-all duration-700`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted pt-1">
        <span>Verified by SuperMemo-2 Spaced Algorithm</span>
        <span className="text-primary font-medium flex items-center gap-1">
          Detailed Graph <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

const SLIDES_CONFIG = [
  {
    id: 'plan',
    icon: CalendarDays,
    color: 'from-indigo-500/20 to-purple-500/10',
    accent: 'text-indigo-400',
    component: SlidePlanPreview,
  },
  {
    id: 'mentor',
    icon: Brain,
    color: 'from-violet-500/20 to-indigo-500/10',
    accent: 'text-violet-400',
    component: SlideMentorPreview,
  },
  {
    id: 'practice',
    icon: Target,
    color: 'from-sky-500/20 to-indigo-500/10',
    accent: 'text-sky-400',
    component: SlidePracticePreview,
  },
  {
    id: 'progress',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-teal-500/10',
    accent: 'text-emerald-400',
    component: SlideProgressPreview,
  },
];

function StorytellingSlideTheater({ videoUrl = null }) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES_CONFIG.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES_CONFIG.length) % SLIDES_CONFIG.length);
    setProgress(0);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  // Timer & progress bar loop
  useEffect(() => {
    if (!isPlaying || isHovered) {
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }

    const increment = (PROGRESS_INTERVAL / SLIDE_DURATION) * 100;

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + increment;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isPlaying, isHovered, nextSlide]);

  const activeConfig = SLIDES_CONFIG[currentSlide];
  const slideKey = activeConfig.id;
  const ActiveComponent = activeConfig.component;

  return (
    <div
      className="relative rounded-3xl border border-subtle bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient background glow according to slide theme */}
      <div
        className={`absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br ${activeConfig.color} rounded-full blur-[140px] pointer-events-none transition-all duration-700`}
      />

      {/* Top Header Bar */}
      <div className="relative px-5 md:px-8 py-4 border-b border-subtle flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('landing.storyTheater.badge')}
          </div>
          <span className="text-xs text-muted/70 hidden sm:inline">
            {t('landing.storyTheater.chapter')} {currentSlide + 1} / {SLIDES_CONFIG.length}
          </span>
        </div>

        {/* Media mode tag (Truth in labeling: clarifies simulated interactive preview vs real video) */}
        <div className="flex items-center gap-2">
          {videoUrl ? (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Video Stream
            </span>
          ) : (
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {t('landing.storyTheater.liveSimulation')}
            </span>
          )}

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="p-1.5 rounded-lg border border-subtle bg-white/[0.04] hover:bg-white/[0.08] text-muted hover:text-text transition-colors cursor-pointer"
            aria-label={isPlaying ? t('landing.storyTheater.pause') : t('landing.storyTheater.play')}
            title={isPlaying ? t('landing.storyTheater.pause') : t('landing.storyTheater.play')}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Chapter Navigation Tabs */}
      <div className="relative border-b border-subtle bg-black/20">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-subtle">
          {SLIDES_CONFIG.map((config, idx) => {
            const isActive = idx === currentSlide;
            const Icon = config.icon;
            return (
              <button
                key={config.id}
                onClick={() => goToSlide(idx)}
                className={`relative p-3 md:p-4 text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.04] text-text'
                    : 'text-muted hover:text-text hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? config.accent : 'text-muted'}`} />
                  <span className="text-xs font-semibold truncate">
                    {t(`landing.storyTheater.slides.${config.id}.navTitle`)}
                  </span>
                </div>
                <p className="text-[11px] text-muted/70 truncate hidden md:block">
                  {t(`landing.storyTheater.slides.${config.id}.tag`)}
                </p>

                {/* Individual Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/[0.04]">
                  {isActive && (
                    <div
                      className="h-full bg-primary transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stage Content: Copy on Left, Stage Preview on Right */}
      <div className="relative p-5 md:p-8 lg:p-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Narrative Copy */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-subtle text-[11px] font-medium text-muted">
              <span>{t(`landing.storyTheater.slides.${slideKey}.tag`)}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{t(`landing.storyTheater.slides.${slideKey}.badge`)}</span>
            </div>

            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-text tracking-tight leading-snug">
              {t(`landing.storyTheater.slides.${slideKey}.title`)}
            </h3>

            <p className="text-sm sm:text-base text-muted leading-relaxed">
              {t(`landing.storyTheater.slides.${slideKey}.desc`)}
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs font-medium text-text">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{t(`landing.storyTheater.slides.${slideKey}.metric`)}</span>
              </div>
            </div>

            {/* Slide Navigation Controls */}
            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="p-2 rounded-xl border border-subtle bg-white/[0.03] hover:bg-white/[0.08] text-muted hover:text-text transition-colors cursor-pointer"
                aria-label={t('landing.storyTheater.previous')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2 rounded-xl border border-subtle bg-white/[0.03] hover:bg-white/[0.08] text-muted hover:text-text transition-colors cursor-pointer"
                aria-label={t('landing.storyTheater.next')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted ml-2">
                {isHovered ? (
                  <span className="text-amber-400/90 font-mono text-[11px]">Paused (hover)</span>
                ) : (
                  <span className="text-muted/60 font-mono text-[11px]">{Math.round((SLIDE_DURATION * (100 - progress)) / 1000)}s</span>
                )}
              </span>
            </div>
          </div>

          {/* Right Column: Live Simulated Screen / Video Player Fallback */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl border border-subtle bg-dark/95 p-4 md:p-6 shadow-2xl">
              {/* Window Header bar mockup */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  <span className="text-[11px] font-mono text-muted/60 ml-2">eduflow.app/session</span>
                </div>
                <div className="text-[10px] text-muted/60 font-mono">60fps Live Preview</div>
              </div>

              {/* Render either real video or the interactive live component */}
              {videoUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </div>
              ) : (
                <div className="min-h-[300px] flex flex-col justify-center">
                  <ActiveComponent />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StorytellingSlideTheater;
