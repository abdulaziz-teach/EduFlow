import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  CheckCircle,
  Headphones,
  Coffee,
  CloudRain,
  Radio,
  Wind,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { logFocusSession } from '../services/studySession';
import { useAuth } from '../context/AuthContext';

// Web Audio API Synthesizer for Ambient Soundscapes
class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.activeNodes = [];
    this.currentMode = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    this.activeNodes.forEach((n) => {
      try {
        if (n.stop) n.stop();
        if (n.disconnect) n.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    });
    this.activeNodes = [];
    this.currentMode = null;
  }

  playChime() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.8);
  }

  playRain() {
    this.init();
    this.stop();
    this.currentMode = 'rain';

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to simulate soft rain
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, gain);
  }

  playWhiteNoise() {
    this.init();
    this.stop();
    this.currentMode = 'whitenoise';

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.04;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
    this.activeNodes.push(noise, gain);
  }

  playLofi() {
    this.init();
    this.stop();
    this.currentMode = 'lofi';

    // Create gentle chill chord synthesizer pads
    const notes = [261.63, 329.63, 392.0, 493.88]; // Cmaj7 chord
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    notes.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Add gentle LFO tremolo
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      lfo.connect(lfoGain.gain);

      osc.connect(gain);
      osc.start();
      this.activeNodes.push(osc, lfo);
    });

    gain.connect(this.ctx.destination);
    this.activeNodes.push(gain);
  }

  playCafe() {
    this.init();
    this.stop();
    this.currentMode = 'cafe';

    // Warm filtered background noise
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.activeNodes.push(noise, filter, gain);
  }
}

const audioEngine = new AmbientAudioEngine();

const MODES = {
  POMODORO: { key: 'pomodoro', name: 'Pomodoro', minutes: 25, type: 'work' },
  DEEP: { key: 'deepFocus', name: 'Deep Focus', minutes: 50, type: 'work' },
  SHORT_BREAK: { key: 'shortBreak', name: 'Short Break', minutes: 5, type: 'break' },
  LONG_BREAK: { key: 'longBreak', name: 'Long Break', minutes: 15, type: 'break' },
};

export default function FocusRoom() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeMode, setActiveMode] = useState(MODES.POMODORO);
  const [timeLeft, setTimeLeft] = useState(MODES.POMODORO.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSound, setActiveSound] = useState('none');
  const [selectedSubject, setSelectedSubject] = useState(
    (user?.subjects && user.subjects[0]) || 'General Study'
  );
  const [sessionSuccessMsg, setSessionSuccessMsg] = useState(null);

  const containerRef = useRef(null);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      audioEngine.playChime();
      handleSessionCompleted();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const handleSessionCompleted = async () => {
    if (activeMode.type === 'work') {
      try {
        await logFocusSession(activeMode.minutes, selectedSubject);
        setSessionSuccessMsg(
          t('focusRoom.sessionCompleted', { minutes: activeMode.minutes })
        );
      } catch (err) {
        console.error('Failed to log focus session:', err);
      }
    }
  };

  const handleModeChange = (mode) => {
    setIsRunning(false);
    setActiveMode(mode);
    setTimeLeft(mode.minutes * 60);
    setSessionSuccessMsg(null);
  };

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
    setSessionSuccessMsg(null);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(activeMode.minutes * 60);
    setSessionSuccessMsg(null);
  };

  const handleSoundChange = (soundKey) => {
    if (activeSound === soundKey) {
      audioEngine.stop();
      setActiveSound('none');
    } else {
      setActiveSound(soundKey);
      if (soundKey === 'lofi') audioEngine.playLofi();
      if (soundKey === 'rain') audioEngine.playRain();
      if (soundKey === 'cafe') audioEngine.playCafe();
      if (soundKey === 'whitenoise') audioEngine.playWhiteNoise();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = activeMode.minutes * 60;
  const progressPercent = Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-between transition-colors duration-500 ${
        isFullscreen ? 'bg-darker pt-10' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>{t('focusRoom.title')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {t('focusRoom.title')}
          </h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-card border border-subtle rounded-xl px-2.5 sm:px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary max-w-[200px] truncate"
          >
            {(user?.subjects && user.subjects.length > 0 ? user.subjects : ['General Study']).map(
              (subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              )
            )}
          </select>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-muted hover:text-text bg-card border border-subtle rounded-xl transition-colors shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Zen Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 flex-wrap">
        {Object.values(MODES).map((mode) => (
          <button
            key={mode.key}
            onClick={() => handleModeChange(mode)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeMode.key === mode.key
                ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                : 'bg-card text-muted hover:text-text border border-subtle'
            }`}
          >
            {t(`focusRoom.${mode.key}`)}
          </button>
        ))}
      </div>

      {/* Big Timer Circle */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Circular progress SVG */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-card"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-primary transition-all duration-1000"
              strokeWidth="10"
              strokeDasharray="276"
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-5xl sm:text-7xl font-extrabold text-text tracking-tight font-mono">
              {formattedTime}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-muted mt-2 tracking-widest uppercase">
              {activeMode.type === 'work' ? '🔥 Focus Mode' : '☕ Relax & Recharge'}
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {sessionSuccessMsg && (
          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{sessionSuccessMsg}</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={handleReset}
            className="p-3.5 rounded-xl bg-card hover:bg-white/5 border border-subtle text-muted hover:text-text transition-all"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <Button
            onClick={handleTogglePlay}
            size="lg"
            className="px-8 py-3.5 text-base flex items-center gap-2 rounded-xl shadow-xl shadow-primary/20"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>{t('focusRoom.pause')}</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>{t('focusRoom.start')}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Ambient Soundscape Bar */}
      <div className="mt-8 bg-card border border-subtle rounded-2xl p-5 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3 text-xs text-muted font-semibold">
          <div className="flex items-center gap-1.5 text-text">
            <Headphones className="w-4 h-4 text-primary" />
            <span>{t('focusRoom.ambientSounds')}</span>
          </div>
          {activeSound !== 'none' && (
            <span className="text-accent flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              Playing
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleSoundChange('lofi')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSound === 'lofi'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-dark/50 border-subtle text-muted hover:text-text'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{t('focusRoom.lofi')}</span>
          </button>

          <button
            onClick={() => handleSoundChange('rain')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSound === 'rain'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-dark/50 border-subtle text-muted hover:text-text'
            }`}
          >
            <CloudRain className="w-4 h-4" />
            <span>{t('focusRoom.rain')}</span>
          </button>

          <button
            onClick={() => handleSoundChange('cafe')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSound === 'cafe'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-dark/50 border-subtle text-muted hover:text-text'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>{t('focusRoom.cafe')}</span>
          </button>

          <button
            onClick={() => handleSoundChange('whitenoise')}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSound === 'whitenoise'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-dark/50 border-subtle text-muted hover:text-text'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>{t('focusRoom.whitenoise')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
