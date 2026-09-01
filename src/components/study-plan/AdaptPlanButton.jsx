import { useState } from 'react';
import AdaptationModal from './AdaptationModal';

function AdaptPlanButton({ planId, onAdapted, plan }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Status computation for display
  const getAdaptationStatusText = () => {
    if (!plan) return '';
    if (plan.adaptation && plan.adaptation.lastAdaptedAt) {
      // Check if adapted recently
      return 'Recently adapted';
    }
    return 'Active';
  };

  const statusText = getAdaptationStatusText();

  return (
    <div className="flex items-center gap-3">
      {statusText && (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 select-none uppercase tracking-wide shrink-0">
          Status: {statusText}
        </span>
      )}
      
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/15 cursor-pointer text-center shrink-0"
      >
        Adjust my plan
      </button>

      <AdaptationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planId={planId}
        onAdapted={onAdapted}
      />
    </div>
  );
}

export default AdaptPlanButton;
