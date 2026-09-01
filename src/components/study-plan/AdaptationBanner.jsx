import { useNavigate } from 'react-router-dom';

function AdaptationBanner({ plan }) {
  const navigate = useNavigate();
  if (!plan || !plan.adaptation || !plan.adaptation.lastAdaptedAt) return null;

  // Render only if adaptation happened in the last 24 hours
  const elapsedMs = Date.now() - new Date(plan.adaptation.lastAdaptedAt).getTime();
  if (elapsedMs > 24 * 60 * 60 * 1000) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans select-none">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-indigo-400">Your study plan was updated</h4>
        <p className="text-xs text-muted text-left">
          We&apos;ve adjusted upcoming tasks to match your recent progress.
        </p>
      </div>
      <button
        onClick={() => navigate('/study-plan')}
        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow shadow-indigo-600/20 shrink-0"
      >
        View changes
      </button>
    </div>
  );
}

export default AdaptationBanner;
