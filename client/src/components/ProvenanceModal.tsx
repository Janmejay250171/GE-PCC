import React from 'react';
import { X, FileText, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface ProvenanceDetails {
  fieldName: string;
  fieldValue: string;
  provenanceType: 'EXTRACTED_POLICY_FACT' | 'DERIVED_POLICY_VALUE' | 'NETWORK_REFERENCE_MATCH' | 'DATASET_LISTED' | 'UNKNOWN';
  documentName?: string;
  pageClause?: string;
  sourceSnippet?: string;
  confidence?: 'high' | 'medium' | 'low' | 'assumed';
  explanation?: string;
}

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: ProvenanceDetails | null;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  isOpen,
  onClose,
  details
}) => {
  if (!isOpen || !details) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container provenance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <FileText size={20} className="text-primary" />
            <div>
              <h3 className="modal-heading">Data Provenance & Source Evidence</h3>
              <p className="modal-subheading">How SehatSure established this specific value</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body provenance-body">
          {/* Target Value Card */}
          <div className="provenance-value-card">
            <span className="prov-label">{details.fieldName}</span>
            <div className="prov-main-val">{details.fieldValue}</div>
            <div className="prov-type-badge">
              {details.provenanceType === 'EXTRACTED_POLICY_FACT' && (
                <span className="badge badge-exact">
                  <CheckCircle2 size={13} /> Extracted Policy Fact
                </span>
              )}
              {details.provenanceType === 'DERIVED_POLICY_VALUE' && (
                <span className="badge badge-specialty">
                  <Info size={13} /> Derived Policy Value
                </span>
              )}
              {details.provenanceType === 'NETWORK_REFERENCE_MATCH' && (
                <span className="badge badge-exact">
                  <CheckCircle2 size={13} /> Reference Network Match
                </span>
              )}
              {details.provenanceType === 'DATASET_LISTED' && (
                <span className="badge badge-tier">
                  <Info size={13} /> Reference Dataset Fact
                </span>
              )}
              {details.provenanceType === 'UNKNOWN' && (
                <span className="badge badge-warning">
                  <AlertTriangle size={13} /> Unspecified / Unknown
                </span>
              )}
            </div>
          </div>

          {/* Source Document & Snippet */}
          <div className="provenance-evidence-box">
            <div className="evidence-header">
              <strong>Source Reference:</strong>
              <span>{details.pageClause || 'Policy Schedule'}</span>
            </div>
            {details.documentName && (
              <div className="evidence-doc">
                Document: <em>{details.documentName}</em>
              </div>
            )}
            <blockquote className="evidence-quote">
              "{details.sourceSnippet || 'Value extracted directly from policy terms schedule.'}"
            </blockquote>
          </div>

          {/* Explanation */}
          {details.explanation && (
            <div className="provenance-impact-box">
              <strong>Why this value matters:</strong>
              <p>{details.explanation}</p>
            </div>
          )}

          <div className="provenance-notice">
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              SehatSure never invents missing information. Missing or unstated terms are preserved as strictly unknown.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
