import React from 'react';
import { CheckCircle2, Hospital, Calculator, ArrowLeft } from 'lucide-react';
import { PolicyDocument } from '../types/policy';

interface NextStepPlaceholderPageProps {
  policy: PolicyDocument;
  onBackToEdit: () => void;
  onReset: () => void;
}

export const NextStepPlaceholderPage: React.FC<NextStepPlaceholderPageProps> = ({
  policy,
  onBackToEdit,
  onReset
}) => {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', maxWidth: '640px', margin: '0 auto' }}>
      <div
        style={{
          width: '72px',
          height: '72px',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}
      >
        <CheckCircle2 size={40} />
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Policy Terms Confirmed!</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', marginBottom: '28px' }}>
        Your policy terms for <strong>{policy.insurer}</strong> ({policy.planName || 'Plan'}) are confirmed (<code>confirmedByUser: true</code>).
      </p>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          textAlign: 'left',
          marginBottom: '32px'
        }}
      >
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-primary)' }}>
          Ready for Subsequent Features:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}>
              <Hospital size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Feature 2: Hospital Discovery & Reference Network Matcher</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
                Matches {policy.insurer} against reference network hospitals in your city and zone ({policy.zone || 'Default'}).
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}>
              <Calculator size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Feature 3: Out-of-Pocket Cost Simulation Engine</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
                Estimates indicative patient share based on your room limit ({policy.roomLimit?.type === 'amount' ? `₹${policy.roomLimit.value}/day` : policy.roomLimit?.type === 'percent' ? `${policy.roomLimit.value}% of SI` : 'No capping'}), {policy.copay}% co-pay, and proportionate deductions.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onBackToEdit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Review Policy Terms
        </button>

        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            padding: '10px 22px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Upload Another Policy
        </button>
      </div>
    </div>
  );
};
