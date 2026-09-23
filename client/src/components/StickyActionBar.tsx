import React from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface StickyActionBarProps {
  missingCount: number;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  missingCount,
  onContinue,
  isSubmitting = false
}) => {
  const isComplete = missingCount === 0;

  return (
    <aside className="sticky-bar" aria-label="Action confirmation">
      <div className="sticky-bar-inner">
        <div className="sticky-counter-wrap">
          {isComplete ? (
            <div className="sticky-counter-badge counter-green">
              <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              All required fields completed
            </div>
          ) : (
            <div className="sticky-counter-badge counter-amber">
              <AlertTriangle size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {missingCount} required {missingCount === 1 ? 'field' : 'fields'} left to fill
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-continue"
          disabled={!isComplete || isSubmitting}
          onClick={onContinue}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              Looks right, continue <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
