import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UploadZone } from './UploadZone';
import { PolicyDocument } from '../types/policy';
import { uploadPolicyPdf, createPolicyFromDemo } from '../services/api';

interface UploadPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPolicyLoaded: (policy: PolicyDocument) => void;
}

export const UploadPolicyModal: React.FC<UploadPolicyModalProps> = ({
  isOpen,
  onClose,
  onPolicyLoaded
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Uploading policy document...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressTimersRef = useRef<number[]>([]);

  const clearTimers = () => {
    progressTimersRef.current.forEach((id) => clearTimeout(id));
    progressTimersRef.current = [];
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimers();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setErrorMessage(null);
    onClose();
  };

  const handleFileSelected = async (file: File) => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Uploading policy document...');

    // Dynamic progressive status messages as AI analyzes multi-page PDF
    progressTimersRef.current.push(
      window.setTimeout(() => {
        setStatusMessage('Reading policy pages & schedule table...');
      }, 3000),
      window.setTimeout(() => {
        setStatusMessage('Extracting Sum Insured, room rent limits & ICU caps...');
      }, 10000),
      window.setTimeout(() => {
        setStatusMessage('Evaluating co-payment clauses, exclusions & waiting periods...');
      }, 20000),
      window.setTimeout(() => {
        setStatusMessage('Finalizing structured policy constraints & coverage details...');
      }, 32000),
      // 65-second safety timeout
      window.setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setLoading(false);
        setErrorMessage(
          'Document analysis took longer than 60 seconds. You can retry or pick one of the verified benchmark policies below to continue immediately.'
        );
      }, 65000)
    );

    try {
      const res = await uploadPolicyPdf(
        file,
        (step) => setStatusMessage(step),
        abortController.signal
      );
      clearTimers();
      onPolicyLoaded(res.policy);
      handleDismiss();
    } catch (err: any) {
      clearTimers();
      if (err.name === 'AbortError') {
        setLoading(false);
        return;
      }
      setErrorMessage(err.message || 'Failed to analyze policy document.');
      setLoading(false);
    }
  };

  const handleSelectDemo = async (demoKey: string) => {
    clearTimers();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Loading verified benchmark policy...');
    try {
      const res = await createPolicyFromDemo(demoKey);
      onPolicyLoaded(res.policy);
      handleDismiss();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load demo policy.');
      setLoading(false);
    }
  };

  return (
    <div
      className="provenance-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Dismiss if clicking outer overlay backdrop
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div className="provenance-modal" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="modal-header-clean">
          <div className="modal-header-left">
            <Upload size={18} className="text-primary" />
            <h3 className="modal-title">Upload or Select Insurance Policy</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleDismiss}
            title="Close dialog (Esc)"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-clean">
          {errorMessage && (
            <div className="sim-callout-box" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Loader2 size={36} className="text-primary animate-spin" />
              <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{statusMessage}</strong>
              <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: 380, lineHeight: 1.5 }}>
                Analyzing policy terms, sum insured, room rent limits, and co-payment clauses.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDismiss}
                style={{ marginTop: 8 }}
              >
                <span>Cancel & Close</span>
              </button>
            </div>
          ) : (
            <>
              {/* File Dropzone */}
              <UploadZone onFileSelected={handleFileSelected} disabled={loading} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 600 }}>
                  Or Choose Verified Benchmark Policy
                </span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>

              {/* Benchmark Demos */}
              <div className="benchmark-cards-grid">
                <button
                  type="button"
                  className="feature-pill-card"
                  onClick={() => handleSelectDemo('hdfc-ergo')}
                  style={{ textAlign: 'left', cursor: 'pointer', padding: '14px 12px' }}
                >
                  <div className="feature-icon-circle" style={{ background: '#EFF6FF', color: '#2563EB', width: 34, height: 34 }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>HDFC ERGO Group</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>₹5L SI • 1% Room Cap • 0% Co-pay</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="feature-pill-card"
                  onClick={() => handleSelectDemo('star-health')}
                  style={{ textAlign: 'left', cursor: 'pointer', padding: '14px 12px' }}
                >
                  <div className="feature-icon-circle" style={{ background: '#ECFDF5', color: '#059669', width: 34, height: 34 }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>Star Health Optima</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>₹3L SI • ₹3k Room Cap • 10% Co-pay</div>
                  </div>
                </button>
              </div>

              {/* Dismiss footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleDismiss}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
