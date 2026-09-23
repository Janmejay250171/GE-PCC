import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { ConfidenceLevel } from '../types/policy';

export interface SelectOption {
  value: string;
  label: string;
}

interface InlineFieldProps {
  id: string;
  label: string;
  value: any;
  onChange: (val: any) => void;
  type?: 'text' | 'number' | 'select' | 'toggle' | 'date';
  options?: SelectOption[];
  isRequired?: boolean;
  confidence?: ConfidenceLevel;
  sourceSnippet?: string;
  placeholder?: string;
  helpText?: string;
  suffix?: string;
  disabled?: boolean;
}

export const InlineField: React.FC<InlineFieldProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  isRequired = false,
  confidence,
  sourceSnippet,
  placeholder,
  helpText,
  suffix,
  disabled = false
}) => {
  const [showSnippet, setShowSnippet] = useState(false);
  const [showConfidenceTip, setShowConfidenceTip] = useState(false);

  const isEmpty = value === null || value === undefined || value === '';
  const isLowOrAssumed = confidence === 'low' || confidence === 'assumed';

  const defaultPlaceholder = isRequired
    ? 'Add this'
    : 'Not found in your policy — add it if you know it';

  const inputClass = `field-input ${
    isEmpty ? (isRequired ? 'empty-required' : 'empty-optional') : ''
  }`;

  return (
    <div className="field-item">
      <div className="field-label-row">
        <label htmlFor={id} className="field-label">
          <span>{label}</span>

          {isRequired && <span className="field-label-required">Required</span>}

          {/* Confidence indicator dot */}
          {isLowOrAssumed && (
            <span
              className="confidence-dot"
              onMouseEnter={() => setShowConfidenceTip(true)}
              onMouseLeave={() => setShowConfidenceTip(false)}
              onClick={() => setShowConfidenceTip(!showConfidenceTip)}
              title="Please check this"
            >
              {showConfidenceTip && (
                <div className="source-popover">
                  <strong>Please check this</strong>
                  <div>
                    {confidence === 'assumed'
                      ? 'Defaulted or scheme standard value. Please verify against your document.'
                      : 'AI detected this field with low confidence.'}
                  </div>
                </div>
              )}
            </span>
          )}

          {/* Filled field source snippet info button */}
          {!isEmpty && sourceSnippet && (
            <span
              className="source-snippet-trigger"
              onMouseEnter={() => setShowSnippet(true)}
              onMouseLeave={() => setShowSnippet(false)}
              onClick={() => setShowSnippet(!showSnippet)}
              title="View source snippet from policy document"
            >
              <Info size={14} />
              {showSnippet && (
                <div className="source-popover">
                  <div style={{ color: confidence === 'assumed' ? '#FCD34D' : '#86EFAC', fontWeight: 600, marginBottom: 2 }}>
                    {confidence === 'assumed' ? 'System Assumption / Default Notice:' : 'From Policy PDF:'}
                  </div>
                  <div>"{sourceSnippet}"</div>
                </div>
              )}
            </span>
          )}
        </label>
      </div>

      <div className="input-container">
        {type === 'toggle' ? (
          <div className="toggle-field-wrap" style={{ width: '100%' }}>
            <span style={{ fontSize: '0.9rem', color: value ? '#1E4F39' : '#5C6B64', fontWeight: 500 }}>
              {value ? 'Enabled / Covered' : 'Not Included / Disabled'}
            </span>
            <label className="toggle-switch">
              <input
                id={id}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ) : type === 'select' ? (
          <select
            id={id}
            className={`field-select ${isEmpty ? (isRequired ? 'empty-required' : 'empty-optional') : ''}`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            disabled={disabled}
          >
            <option value="">{placeholder || defaultPlaceholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === 'number' ? (
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id={id}
              type="number"
              className={inputClass}
              value={value ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange(v === '' ? null : parseFloat(v));
              }}
              placeholder={placeholder || defaultPlaceholder}
              disabled={disabled}
            />
            {suffix && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-subtle)',
                  fontSize: '0.85rem'
                }}
              >
                {suffix}
              </span>
            )}
          </div>
        ) : type === 'date' ? (
          <input
            id={id}
            type="date"
            className={inputClass}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
          />
        ) : (
          <input
            id={id}
            type="text"
            className={inputClass}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
          />
        )}
      </div>

      {helpText && (
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
          {helpText}
        </span>
      )}
    </div>
  );
};
