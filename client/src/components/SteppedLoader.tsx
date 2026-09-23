import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface SteppedLoaderProps {
  currentStep?: string;
}

const STEPS = [
  { key: 'uploading', label: 'Uploading…', desc: 'Transferring document for local policy analysis' },
  { key: 'reading', label: 'Reading your policy…', desc: 'Extracting room limits, co-pay clauses and hospital terms' },
  { key: 'validating', label: 'Almost done…', desc: 'Extracting terms and preparing your coverage summary' }
];

export const SteppedLoader: React.FC<SteppedLoaderProps> = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setActiveIndex(1);
    }, 2800);

    const timer2 = setTimeout(() => {
      setActiveIndex(2);
    }, 7000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const activeStep = STEPS[activeIndex];

  return (
    <div className="stepped-loader-overlay">
      <div className="stepped-loader-modal">
        <div className="stepped-spinner-wrap">
          <div className="spinner-ring" />
        </div>
        <h3 className="stepped-current-title">{activeStep.label}</h3>
        <p className="stepped-current-sub">{activeStep.desc}</p>

        <div className="stepped-track">
          {STEPS.map((step, idx) => {
            const isDone = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <div
                key={step.key}
                className={`stepped-step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="text-primary" />
                ) : isActive ? (
                  <Loader2 size={16} className="animate-spin text-primary" />
                ) : (
                  <div className="step-indicator-dot" />
                )}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
