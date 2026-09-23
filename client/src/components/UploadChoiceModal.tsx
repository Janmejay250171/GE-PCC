import { CheckCircle2, AlertTriangle, Edit3, ArrowRight, X } from 'lucide-react';
import { PolicyDocument } from '../types/policy';

interface UploadChoiceModalProps {
  policy: PolicyDocument;
  missingRequired: string[];
  lowConfidence: string[];
  filename?: string;
  onProceedAutoFilled: () => void;
  onEnterManually: () => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  insurer: 'Insurer Name',
  policyType: 'Policy Type',
  sumInsured: 'Sum Insured',
  roomLimit: 'Room Rent Limit',
  copay: 'Co-pay',
  deductible: 'Deductible',
  proportionateDeduction: 'Proportionate Deduction'
};

export const UploadChoiceModal: React.FC<UploadChoiceModalProps> = ({
  policy,
  missingRequired,
  lowConfidence,
  filename,
  onProceedAutoFilled,
  onEnterManually,
  onCancel
}) => {
  const hasMissing = missingRequired && missingRequired.length > 0;
  const missingNames = missingRequired.map((f) => FIELD_LABELS[f] || f);

  // Formatted room limit string for quick preview
  const roomLimitPreview =
    policy.roomLimit?.type === 'amount'
      ? `₹${policy.roomLimit.value?.toLocaleString?.('en-IN') || policy.roomLimit.value}/day`
      : policy.roomLimit?.type === 'percent'
      ? `${policy.roomLimit.value}% of Sum Insured`
      : policy.roomLimit?.type === 'category'
      ? String(policy.roomLimit.value)
      : policy.roomLimit?.type === 'none'
      ? 'No room capping'
      : 'Not detected';

  return (
    <div className="choice-modal-overlay" role="dialog" aria-modal="true">
      <div className="choice-modal-container">
        <button
          type="button"
          className="choice-modal-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {/* Modal Status Header */}
        <div className="choice-modal-header">
          <div className={`choice-status-icon-wrap ${hasMissing ? 'warning' : 'success'}`}>
            {hasMissing ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
          </div>

          <h2 className="choice-modal-title">
            {hasMissing
              ? 'Required Policy Details Missing from PDF'
              : 'Policy Terms Successfully Detected!'}
          </h2>

          <p className="choice-modal-subtitle">
            {filename ? <span>Document: <strong>{filename}</strong>. </span> : null}
            {hasMissing ? (
              <>
                The AI analyzed your document, but could not locate all required coverage constraints. Please <strong>enter the missing details manually</strong> to proceed.
              </>
            ) : (
              <>
                All essential coverage parameters were identified. You can <strong>keep the auto-filled details and proceed</strong>, or choose to <strong>enter manually</strong>.
              </>
            )}
          </p>
        </div>

        {/* Informational Alert Box */}
        {hasMissing ? (
          <div className="choice-missing-alert">
            <div className="choice-alert-title">
              <AlertTriangle size={16} /> Missing Required Fields ({missingRequired.length})
            </div>
            <div className="choice-alert-desc">
              The following fields could not be confirmed from the document text:
            </div>
            <div className="choice-missing-chips">
              {missingNames.map((name) => (
                <span key={name} className="choice-missing-chip">
                  {name}
                </span>
              ))}
            </div>
            <div className="choice-alert-footer">
              👉 <em>You can keep what was found and fill in the missing fields, or enter all details manually.</em>
            </div>
          </div>
        ) : (
          <div className="choice-preview-box">
            <div className="choice-preview-title">
              <CheckCircle2 size={16} className="text-primary" />
              <span>Detected Policy Snapshot</span>
              {lowConfidence && lowConfidence.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 500, textTransform: 'none' }}>
                  ({lowConfidence.length} term{lowConfidence.length > 1 ? 's' : ''} to check)
                </span>
              )}
            </div>
            <div className="choice-preview-grid">
              <div className="choice-preview-item">
                <span className="choice-preview-label">Insurer</span>
                <span className="choice-preview-val">{policy.insurer || 'Detected'}</span>
              </div>
              <div className="choice-preview-item">
                <span className="choice-preview-label">Sum Insured</span>
                <span className="choice-preview-val">
                  {policy.policyType === 'esi'
                    ? 'Unlimited (ESI)'
                    : policy.sumInsured
                    ? `₹${policy.sumInsured.toLocaleString('en-IN')}`
                    : 'Not specified'}
                </span>
              </div>
              <div className="choice-preview-item">
                <span className="choice-preview-label">Room Limit</span>
                <span className="choice-preview-val">{roomLimitPreview}</span>
              </div>
              <div className="choice-preview-item">
                <span className="choice-preview-label">Base Co-pay</span>
                <span className="choice-preview-val">
                  {policy.copay !== null && policy.copay !== undefined ? `${policy.copay}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* The Two Choice Options */}
        <div className="choice-options-grid">
          {/* Option 1: Automatically Filled */}
          <div
            className={`choice-card option-auto ${!hasMissing ? 'highlighted' : ''}`}
            onClick={onProceedAutoFilled}
          >
            <div className="choice-card-header">
              <div className="choice-badge-row">
                <span className="choice-type-pill pill-auto">
                  <CheckCircle2 size={13} /> Option 1: Extracted From Document
                </span>
                {!hasMissing && <span className="choice-recommended-badge">Recommended</span>}
              </div>
              <h3 className="choice-card-name">
                {hasMissing
                  ? 'Keep Extracted Details & Fill Missing Manually'
                  : 'Keep Auto-Filled Details & Proceed'}
              </h3>
            </div>
            <p className="choice-card-desc">
              {hasMissing
                ? 'Loads all detected fields into the summary. Missing items will be highlighted in amber with "Add this" for you to enter.'
                : 'Loads the extracted policy terms directly into the Coverage Summary for your review.'}
            </p>
            <button type="button" className="btn-choice-action primary">
              <span>{hasMissing ? 'Proceed & Enter Missing' : 'Proceed with Auto-Filled'}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Option 2: Enter Manually */}
          <div className="choice-card option-manual" onClick={onEnterManually}>
            <div className="choice-card-header">
              <div className="choice-badge-row">
                <span className="choice-type-pill pill-manual">
                  <Edit3 size={13} /> Option 2: Enter Manually
                </span>
              </div>
              <h3 className="choice-card-name">Enter Policy Details Manually</h3>
            </div>
            <p className="choice-card-desc">
              Prefer to fill everything yourself? Discards the AI extraction and opens an empty policy form where you can enter every term from scratch.
            </p>
            <button type="button" className="btn-choice-action secondary">
              <span>Enter Manually</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
