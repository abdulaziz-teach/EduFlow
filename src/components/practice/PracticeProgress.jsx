function PracticeProgress({ current, total }) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="space-y-2 font-sans select-none">
      <div className="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-wider">
        <span>Session progress</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default PracticeProgress;
