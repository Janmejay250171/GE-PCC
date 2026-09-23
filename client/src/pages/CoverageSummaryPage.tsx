import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Building2,
  IndianRupee,
  Percent,
  Users,
  ArrowRight,
  ArrowLeft,
  Info,
  Layers,
  ShieldCheck,
  Edit3,
  X,
  Loader2
} from 'lucide-react';
import { PolicyDocument, TIER_1_REQUIRED_FIELDS, NetworkType } from '../types/policy';
import { updatePolicy } from '../services/api';

interface CoverageSummaryPageProps {
  policy: PolicyDocument;
  onPolicyConfirmed: (confirmedPolicy: PolicyDocument) => void;
  onBackToUpload: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  insurer: 'Insurer Name',
  policyType: 'Policy Type',
  sumInsured: 'Sum Insured',
  roomLimit: 'Room Rent Limit',
  copay: 'Base Co-pay',
  deductible: 'Deductible',
  proportionateDeduction: 'Proportionate Deduction'
};

export const CoverageSummaryPage: React.FC<CoverageSummaryPageProps> = ({
  policy,
  onPolicyConfirmed,
  onBackToUpload
}) => {
  const [currentPolicy, setCurrentPolicy] = useState<PolicyDocument>(policy);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [editSumInsured, setEditSumInsured] = useState<string>('');
  const [editCopay, setEditCopay] = useState<string>('');
  const [editNonNetworkCopay, setEditNonNetworkCopay] = useState<string>('');
  const [editDeductible, setEditDeductible] = useState<string>('');
  const [editRoomLimitType, setEditRoomLimitType] = useState<'amount' | 'percent' | 'category' | 'none'>('none');
  const [editRoomLimitValue, setEditRoomLimitValue] = useState<string>('');
  const [editProportionateDeduction, setEditProportionateDeduction] = useState<boolean>(false);
  const [editNetworkType, setEditNetworkType] = useState<NetworkType>('all-network');

  useEffect(() => {
    setCurrentPolicy(policy);
  }, [policy]);

  // Check if policy has missing Tier 1 required items
  const missingTier1Fields: string[] = [];
  for (const field of TIER_1_REQUIRED_FIELDS) {
    if (field === 'sumInsured' && currentPolicy.policyType === 'esi') {
      continue; // ESI is statutory unlimited cover
    }
    const val = currentPolicy[field];
    if (val === null || val === undefined || val === '') {
      missingTier1Fields.push(field);
    }
  }

  const isPolicyValid = missingTier1Fields.length === 0;

  const handleContinue = async () => {
    if (!isPolicyValid || isSubmitting) return;
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const result = await updatePolicy(currentPolicy._id, { confirmedByUser: true });
      onPolicyConfirmed(result);
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setSaveError(err.message || 'Failed to confirm policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditSumInsured(
      currentPolicy.sumInsured !== null && currentPolicy.sumInsured !== undefined
        ? String(currentPolicy.sumInsured)
        : ''
    );
    setEditCopay(
      currentPolicy.copay !== null && currentPolicy.copay !== undefined
        ? String(currentPolicy.copay)
        : '0'
    );
    setEditNonNetworkCopay(
      currentPolicy.nonNetworkCopay !== null && currentPolicy.nonNetworkCopay !== undefined
        ? String(currentPolicy.nonNetworkCopay)
        : ''
    );
    setEditDeductible(
      currentPolicy.deductible !== null && currentPolicy.deductible !== undefined
        ? String(currentPolicy.deductible)
        : '0'
    );

    const rType = (currentPolicy.roomLimit?.type as any) || 'none';
    setEditRoomLimitType(rType);
    setEditRoomLimitValue(
      currentPolicy.roomLimit?.value !== null && currentPolicy.roomLimit?.value !== undefined
        ? String(currentPolicy.roomLimit.value)
        : ''
    );

    setEditProportionateDeduction(Boolean(currentPolicy.proportionateDeduction));
    setEditNetworkType(currentPolicy.networkType || 'all-network');
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    let siVal: number | null = currentPolicy.sumInsured;
    if (currentPolicy.policyType !== 'esi') {
      const num = parseFloat(editSumInsured);
      if (isNaN(num) || num < 0) {
        errors.sumInsured = 'Sum Insured must be a non-negative number.';
      } else {
        siVal = num;
      }
    }

    const copayVal = parseFloat(editCopay);
    if (isNaN(copayVal) || copayVal < 0 || copayVal > 100) {
      errors.copay = 'Base Co-pay must be between 0% and 100%.';
    }

    let nonNetCopayVal: number | null = null;
    if (editNonNetworkCopay.trim() !== '') {
      const num = parseFloat(editNonNetworkCopay);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.nonNetworkCopay = 'Non-network co-pay must be between 0% and 100%.';
      } else {
        nonNetCopayVal = num;
      }
    }

    const dedVal = parseFloat(editDeductible);
    if (isNaN(dedVal) || dedVal < 0) {
      errors.deductible = 'Deductible must be a non-negative number.';
    }

    let roomLimitObj: any = { type: editRoomLimitType, value: null };
    if (editRoomLimitType === 'amount') {
      const amt = parseFloat(editRoomLimitValue);
      if (isNaN(amt) || amt <= 0) {
        errors.roomLimit = 'Room limit amount must be a number greater than 0.';
      } else {
        roomLimitObj.value = amt;
      }
    } else if (editRoomLimitType === 'percent') {
      const pct = parseFloat(editRoomLimitValue);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        errors.roomLimit = 'Room limit percentage must be between 1% and 100%.';
      } else {
        roomLimitObj.value = pct;
      }
    } else if (editRoomLimitType === 'category') {
      if (!editRoomLimitValue || !editRoomLimitValue.trim()) {
        errors.roomLimit = 'Please select a room category benchmark.';
      } else {
        roomLimitObj.value = editRoomLimitValue.trim();
      }
    } else if (editRoomLimitType === 'none') {
      roomLimitObj = { type: 'none', value: null };
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSavingEdits(true);
    setSaveError(null);

    try {
      const updatedFields: string[] = [];
      const newConfidence = { ...(currentPolicy.confidence || {}) };
      const newSnippets = { ...(currentPolicy.sourceSnippets || {}) };

      if (siVal !== currentPolicy.sumInsured) updatedFields.push('sumInsured');
      if (copayVal !== currentPolicy.copay) updatedFields.push('copay');
      if (nonNetCopayVal !== currentPolicy.nonNetworkCopay) updatedFields.push('nonNetworkCopay');
      if (dedVal !== currentPolicy.deductible) updatedFields.push('deductible');
      if (
        roomLimitObj.type !== currentPolicy.roomLimit?.type ||
        String(roomLimitObj.value) !== String(currentPolicy.roomLimit?.value)
      ) {
        updatedFields.push('roomLimit');
      }
      if (editProportionateDeduction !== currentPolicy.proportionateDeduction) {
        updatedFields.push('proportionateDeduction');
      }
      if (editNetworkType !== currentPolicy.networkType) {
        updatedFields.push('networkType');
      }

      const mergedConfirmed = Array.from(
        new Set([...(currentPolicy.userConfirmedFields || []), ...updatedFields])
      );

      for (const f of updatedFields) {
        newConfidence[f] = 'high';
        newSnippets[f] = 'User-confirmed value';
      }

      const updates: Partial<PolicyDocument> = {
        sumInsured: siVal,
        copay: copayVal,
        nonNetworkCopay: nonNetCopayVal,
        deductible: dedVal,
        roomLimit: roomLimitObj,
        proportionateDeduction: editProportionateDeduction,
        networkType: editNetworkType,
        userConfirmedFields: mergedConfirmed,
        confidence: newConfidence,
        sourceSnippets: newSnippets
      };

      const result = await updatePolicy(currentPolicy._id, updates);
      setCurrentPolicy(result);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save policy updates:', err);
      setSaveError(err.message || 'Failed to save updated policy values.');
    } finally {
      setIsSavingEdits(false);
    }
  };

  // Provenance Badge Renderer
  const renderProvenanceBadge = (field: keyof PolicyDocument) => {
    if (currentPolicy.userConfirmedFields?.includes(field as string)) {
      return (
        <span className="field-badge badge-user-confirmed" title="Field reviewed and confirmed by user">
          User-confirmed
        </span>
      );
    }
    if (currentPolicy.confidence?.[field as string] === 'assumed') {
      return (
        <span className="field-badge badge-system-assumed" title="System-assumed default (not specified in document)">
          System-assumed
        </span>
      );
    }
    return (
      <span className="field-badge badge-ai-extracted" title="Extracted from uploaded policy PDF">
        AI-extracted
      </span>
    );
  };

  // Format Room Limit nicely
  const getRoomLimitText = () => {
    if (!currentPolicy.roomLimit) return 'Not found in document';
    if (currentPolicy.roomLimit.type === 'amount') {
      return `₹${Number(currentPolicy.roomLimit.value).toLocaleString('en-IN')} / day`;
    }
    if (currentPolicy.roomLimit.type === 'percent') {
      return `${currentPolicy.roomLimit.value}% of Sum Insured / day`;
    }
    if (currentPolicy.roomLimit.type === 'category') {
      return String(currentPolicy.roomLimit.value);
    }
    if (currentPolicy.roomLimit.type === 'none') {
      return 'No Capping (Unlimited)';
    }
    return 'Not specified';
  };

  // Format ICU Limit
  const getIcuLimitText = () => {
    if (!currentPolicy.icuLimit || currentPolicy.icuLimit.type === 'none') {
      return 'No separate limit (Covered up to Sum Insured)';
    }
    if (currentPolicy.icuLimit.type === 'percent') {
      return `${currentPolicy.icuLimit.value}% of Sum Insured / day`;
    }
    if (currentPolicy.icuLimit.type === 'amount') {
      return `₹${Number(currentPolicy.icuLimit.value).toLocaleString('en-IN')} / day`;
    }
    return String(currentPolicy.icuLimit.value);
  };

  const getPolicyTypeLabel = (type: string | null) => {
    switch (type) {
      case 'private':
        return 'Retail Private Floater';
      case 'corporate':
        return 'Corporate Group Plan';
      case 'pmjay':
        return 'Ayushman Bharat PM-JAY';
      case 'esi':
        return 'ESI Statutory Cover';
      default:
        return type || 'Standard Health Insurance';
    }
  };

  return (
    <div className="summary-view-wrapper">
      {/* Top Navigation */}
      <div className="summary-top-actions">
        <button type="button" className="btn-back-link" onClick={onBackToUpload}>
          <ArrowLeft size={16} /> Upload different policy
        </button>
      </div>

      {/* Main Header */}
      <header className="summary-executive-header">
        <div className="executive-header-left">
          <div className="executive-insurer-badge">
            <Building2 size={18} className="text-primary" />
            <span>{currentPolicy.insurer || 'Unknown Insurer'}</span>
          </div>
          <h1 className="executive-plan-title">
            {currentPolicy.planName || 'Health Insurance Policy Summary'}
          </h1>
          <div className="executive-meta-row">
            {currentPolicy.policyNumber && (
              <span className="executive-meta-chip">
                Policy No: <strong>{currentPolicy.policyNumber}</strong>
              </span>
            )}
            <span className="executive-meta-chip">
              Plan Type: <strong>{getPolicyTypeLabel(currentPolicy.policyType)}</strong>
            </span>
            {currentPolicy.zone && (
              <span className="executive-meta-chip">
                Zone: <strong>{currentPolicy.zone}</strong>
              </span>
            )}
            {currentPolicy.networkType && (
              <span className="executive-meta-chip">
                Network: <strong>{currentPolicy.networkType}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="executive-header-right">
          {isPolicyValid ? (
            <div className="policy-status-badge valid">
              <CheckCircle2 size={18} />
              <span>Policy Terms Confirmed</span>
            </div>
          ) : (
            <div className="policy-status-badge invalid">
              <AlertOctagon size={18} />
              <span>Incomplete Extraction (Missing Terms)</span>
            </div>
          )}
        </div>
      </header>

      {/* INVALID POLICY NOTICE BANNER */}
      {!isPolicyValid && (
        <div className="invalid-policy-banner">
          <div className="invalid-banner-icon">
            <AlertOctagon size={26} />
          </div>
          <div className="invalid-banner-content">
            <h3 className="invalid-banner-title">
              Incomplete Extraction: Critical Policy Terms Missing
            </h3>
            <p className="invalid-banner-desc">
              The AI analyzed your document, but could not locate the required terms needed to model your hospital out-of-pocket expenses.
            </p>
            <div className="missing-fields-list">
              <span className="missing-label">Missing from PDF:</span>
              {missingTier1Fields.map((field) => (
                <span key={field} className="missing-tag">
                  {FIELD_LABELS[field] || field}
                </span>
              ))}
            </div>
            <p className="invalid-banner-subtext">
              Please enter the values manually using <strong>Edit Values</strong> or upload another policy schedule.
            </p>
            <div style={{ marginTop: '14px', display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-edit-trigger" onClick={handleOpenEditModal}>
                <Edit3 size={15} /> Edit Values Now
              </button>
              <button type="button" className="btn-upload-new" onClick={onBackToUpload}>
                Upload another policy PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALID POLICY CONFIRMATION BANNER */}
      {isPolicyValid && (
        <div className="valid-policy-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div className="valid-banner-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Review Extracted Policy Terms</strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534' }}>
                Verify the terms extracted below. If any limits or co-pay values require correction, click <strong>Edit Values</strong> before continuing.
              </p>
            </div>
          </div>
          <button type="button" className="btn-edit-trigger" onClick={handleOpenEditModal}>
            <Edit3 size={15} /> Edit Values
          </button>
        </div>
      )}

      {saveError && (
        <div className="alert-banner error" style={{ marginBottom: '20px' }}>
          <AlertOctagon size={18} />
          <div>{saveError}</div>
        </div>
      )}

      {/* SUMMARY GRID */}
      <div className="summary-dashboard-grid">
        {/* CARD 1: Key Financial Limits */}
        <section className="summary-card highlight-card">
          <div className="summary-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IndianRupee size={18} className="text-primary" />
              <span>Coverage & Room Limits</span>
            </div>
            <button type="button" className="btn-card-edit" onClick={handleOpenEditModal}>
              Edit value
            </button>
          </div>

          <div className="summary-metrics-row">
            <div className="metric-box">
              <div className="metric-label">
                Sum Insured
                {renderProvenanceBadge('sumInsured')}
              </div>
              <div className="metric-value primary">
                {currentPolicy.policyType === 'esi'
                  ? 'Unlimited (ESI)'
                  : currentPolicy.sumInsured
                  ? `₹${currentPolicy.sumInsured.toLocaleString('en-IN')}`
                  : '—'}
              </div>
              <div className="metric-sub">Annual family hospitalization cover</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">
                Room Rent Limit
                {renderProvenanceBadge('roomLimit')}
              </div>
              <div className="metric-value">
                {getRoomLimitText()}
              </div>
              {currentPolicy.sourceSnippets?.roomLimit && (
                <button
                  type="button"
                  className="snippet-trigger-link"
                  onClick={() =>
                    setActiveSnippet(
                      activeSnippet === currentPolicy.sourceSnippets?.roomLimit
                        ? null
                        : currentPolicy.sourceSnippets?.roomLimit || null
                    )
                  }
                >
                  <Info size={13} /> View snippet
                </button>
              )}
            </div>

            <div className="metric-box">
              <div className="metric-label">
                ICU Charges Limit
                {renderProvenanceBadge('icuLimit')}
              </div>
              <div className="metric-value">
                {getIcuLimitText()}
              </div>
            </div>
          </div>

          {/* Proportionate Deduction Callout */}
          {currentPolicy.proportionateDeduction ? (
            <div className="proportionate-summary-callout">
              <div className="callout-header">
                <strong>⚠️ Proportionate Deduction Clause Active</strong>
                {renderProvenanceBadge('proportionateDeduction')}
              </div>
              <p>
                If you select a hospital room that costs more than your eligible room rent limit ({getRoomLimitText()}), your insurer will also pay a <strong>proportionately smaller share</strong> of surgeon fees, OT charges, diagnostics, and nursing bills.
              </p>
            </div>
          ) : (
            <div className="clean-callout">
              ✓ <strong>No Proportionate Deduction</strong>: You will not face proportional deductions on doctor/OT charges based on your room choice.
              {renderProvenanceBadge('proportionateDeduction')}
            </div>
          )}
        </section>

        {/* CARD 2: Co-payments & Deductibles */}
        <section className="summary-card">
          <div className="summary-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} className="text-primary" />
              <span>Out-of-Pocket Cost Sharing</span>
            </div>
            <button type="button" className="btn-card-edit" onClick={handleOpenEditModal}>
              Edit value
            </button>
          </div>

          <div className="summary-details-list">
            <div className="summary-detail-row">
              <span className="detail-name">
                Base Hospital Co-pay
                {renderProvenanceBadge('copay')}
              </span>
              <span className="detail-val bold">
                {currentPolicy.copay !== null && currentPolicy.copay !== undefined ? `${currentPolicy.copay}%` : '—'}
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">
                Non-Network Hospital Co-pay
                {renderProvenanceBadge('nonNetworkCopay')}
              </span>
              <span className="detail-val">
                {currentPolicy.nonNetworkCopay !== null && currentPolicy.nonNetworkCopay !== undefined
                  ? `${currentPolicy.nonNetworkCopay}%`
                  : 'Not specified in uploaded policy'}
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">
                Compulsory Deductible
                {renderProvenanceBadge('deductible')}
              </span>
              <span className="detail-val">
                {currentPolicy.deductible ? `₹${currentPolicy.deductible.toLocaleString('en-IN')}` : '₹0 (Nil)'}
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">
                Cashless Mode
                {renderProvenanceBadge('networkType')}
              </span>
              <span className="detail-val">
                {currentPolicy.networkType === 'all-network'
                  ? 'Network Cashless (Subject to Empanelment)'
                  : currentPolicy.networkType === 'restricted-network'
                  ? 'Designated Network Facilities Only'
                  : 'Reimbursement Only'}
              </span>
            </div>
          </div>
        </section>

        {/* CARD 3: Procedure Sub-limits & Exclusions */}
        <section className="summary-card">
          <div className="summary-card-title">
            <Layers size={18} className="text-primary" />
            <span>Sub-Limits & Waiting Periods</span>
          </div>

          <div className="summary-details-list">
            <div className="summary-detail-row">
              <span className="detail-name">Procedure Sub-Limits</span>
              <span className="detail-val">
                {currentPolicy.subLimits && Object.keys(currentPolicy.subLimits).length > 0 ? (
                  <div className="sublimits-pill-list">
                    {Object.entries(currentPolicy.subLimits).map(([proc, cap]) => (
                      <span key={proc} className="sublimit-pill">
                        {proc}: ₹{cap.toLocaleString('en-IN')}
                      </span>
                    ))}
                  </div>
                ) : (
                  'Not specified in uploaded policy'
                )}
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">Initial Waiting Period</span>
              <span className="detail-val">{currentPolicy.waitingPeriods?.initial ?? 'Not specified in uploaded policy'}</span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">Pre-Existing Conditions</span>
              <span className="detail-val">{currentPolicy.waitingPeriods?.preExisting ?? 'Not specified in uploaded policy'}</span>
            </div>

            {currentPolicy.waitingPeriods?.maternity && (
              <div className="summary-detail-row">
                <span className="detail-name">Maternity Waiting Period</span>
                <span className="detail-val">{currentPolicy.waitingPeriods.maternity}</span>
              </div>
            )}

            <div className="summary-detail-row">
              <span className="detail-name">Pre / Post Hospitalization</span>
              <span className="detail-val">
                {currentPolicy.preHospitalizationDays || 30} days pre / {currentPolicy.postHospitalizationDays || 60} days post
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">Restoration Benefit</span>
              <span className="detail-val">
                {currentPolicy.restorationBenefit ? '✓ 100% Sum Insured Restoration' : 'Not included'}
              </span>
            </div>
          </div>
        </section>

        {/* CARD 4: Insured Members & Schedule */}
        <section className="summary-card">
          <div className="summary-card-title">
            <Users size={18} className="text-primary" />
            <span>Insured Members & Validity</span>
          </div>

          <div className="summary-details-list">
            <div className="summary-detail-row">
              <span className="detail-name">Covered Persons</span>
              <span className="detail-val">
                {currentPolicy.insuredPersons && currentPolicy.insuredPersons.length > 0 ? (
                  <div className="members-tag-list">
                    {currentPolicy.insuredPersons.map((p, idx) => (
                      <span key={idx} className="member-tag">
                        {p.name} ({p.age} yrs • {p.relation})
                      </span>
                    ))}
                  </div>
                ) : (
                  'Primary policyholder covered'
                )}
              </span>
            </div>

            <div className="summary-detail-row">
              <span className="detail-name">Policy Period</span>
              <span className="detail-val">
                {currentPolicy.policyStartDate && currentPolicy.policyEndDate
                  ? `${currentPolicy.policyStartDate} to ${currentPolicy.policyEndDate}`
                  : 'Policy Period Not Stated in Schedule'}
              </span>
            </div>

            {currentPolicy.tpa && (
              <div className="summary-detail-row">
                <span className="detail-name">TPA / Claims Administrator</span>
                <span className="detail-val">{currentPolicy.tpa}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Snippet modal or popover if active */}
      {activeSnippet && (
        <div className="source-snippet-modal" onClick={() => setActiveSnippet(null)}>
          <div className="source-snippet-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6 }}>
              {currentPolicy.confidence?.['roomLimit'] === 'assumed'
                ? 'System Assumption / Default Notice:'
                : 'Exact Line From Your Document:'}
            </div>
            <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>"{activeSnippet}"</p>
            <button
              type="button"
              className="btn-close-snippet"
              onClick={() => setActiveSnippet(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT VALUES MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => !isSavingEdits && setIsEditModalOpen(false)}>
          <div className="edit-policy-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>
                  Review & Correct Policy Terms
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Adjust extracted policy constraints. Edited terms will be marked as <strong>User-confirmed</strong>.
                </span>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                onClick={() => !isSavingEdits && setIsEditModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdits}>
              <div className="edit-modal-body">
                {/* Sum Insured */}
                <div className="edit-form-group">
                  <label className="edit-form-label" htmlFor="edit-sum-insured">
                    <span>Sum Insured (₹)</span>
                    {currentPolicy.policyType === 'esi' && (
                      <span style={{ fontSize: '0.75rem', color: '#0369A1' }}>Statutory unlimited</span>
                    )}
                  </label>
                  <input
                    id="edit-sum-insured"
                    type="number"
                    className="edit-form-input"
                    value={editSumInsured}
                    onChange={(e) => setEditSumInsured(e.target.value)}
                    disabled={currentPolicy.policyType === 'esi' || isSavingEdits}
                    placeholder="e.g. 500000"
                    min="0"
                  />
                  {formErrors.sumInsured && (
                    <span className="edit-form-error">{formErrors.sumInsured}</span>
                  )}
                </div>

                {/* Room Limit Type & Value */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-room-type">
                      <span>Room Rent Limit Type</span>
                    </label>
                    <select
                      id="edit-room-type"
                      className="edit-form-select"
                      value={editRoomLimitType}
                      onChange={(e) => setEditRoomLimitType(e.target.value as any)}
                      disabled={isSavingEdits}
                    >
                      <option value="none">No Capping (Unlimited)</option>
                      <option value="amount">Fixed Amount (₹/day)</option>
                      <option value="percent">Percentage of Sum Insured (%/day)</option>
                      <option value="category">Category Benchmark</option>
                    </select>
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-room-val">
                      <span>Room Limit Value</span>
                    </label>
                    {editRoomLimitType === 'category' ? (
                      <select
                        id="edit-room-val"
                        className="edit-form-select"
                        value={editRoomLimitValue}
                        onChange={(e) => setEditRoomLimitValue(e.target.value)}
                        disabled={isSavingEdits}
                      >
                        <option value="">Select Room Category…</option>
                        <option value="General Ward">General Ward</option>
                        <option value="Twin Sharing">Twin Sharing</option>
                        <option value="Single Private Room">Single Private Room</option>
                      </select>
                    ) : (
                      <input
                        id="edit-room-val"
                        type={editRoomLimitType === 'none' ? 'text' : 'number'}
                        className="edit-form-input"
                        value={editRoomLimitType === 'none' ? 'No Capping' : editRoomLimitValue}
                        onChange={(e) => setEditRoomLimitValue(e.target.value)}
                        disabled={editRoomLimitType === 'none' || isSavingEdits}
                        placeholder={editRoomLimitType === 'percent' ? 'e.g. 1' : 'e.g. 3000'}
                        min="0"
                      />
                    )}
                    {formErrors.roomLimit && (
                      <span className="edit-form-error">{formErrors.roomLimit}</span>
                    )}
                  </div>
                </div>

                {/* Co-pay and Deductible */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-copay">
                      <span>Base Hospital Co-pay (%)</span>
                    </label>
                    <input
                      id="edit-copay"
                      type="number"
                      className="edit-form-input"
                      value={editCopay}
                      onChange={(e) => setEditCopay(e.target.value)}
                      disabled={isSavingEdits}
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                    />
                    {formErrors.copay && (
                      <span className="edit-form-error">{formErrors.copay}</span>
                    )}
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-deductible">
                      <span>Compulsory Deductible (₹)</span>
                    </label>
                    <input
                      id="edit-deductible"
                      type="number"
                      className="edit-form-input"
                      value={editDeductible}
                      onChange={(e) => setEditDeductible(e.target.value)}
                      disabled={isSavingEdits}
                      placeholder="e.g. 0"
                      min="0"
                    />
                    {formErrors.deductible && (
                      <span className="edit-form-error">{formErrors.deductible}</span>
                    )}
                  </div>
                </div>

                {/* Non-Network Co-pay & Network Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-non-network-copay">
                      <span>Non-Network Co-pay (%)</span>
                    </label>
                    <input
                      id="edit-non-network-copay"
                      type="number"
                      className="edit-form-input"
                      value={editNonNetworkCopay}
                      onChange={(e) => setEditNonNetworkCopay(e.target.value)}
                      disabled={isSavingEdits}
                      placeholder="Leave empty if same as base"
                      min="0"
                      max="100"
                    />
                    {formErrors.nonNetworkCopay && (
                      <span className="edit-form-error">{formErrors.nonNetworkCopay}</span>
                    )}
                  </div>

                  <div className="edit-form-group">
                    <label className="edit-form-label" htmlFor="edit-network-type">
                      <span>Network / Cashless Mode</span>
                    </label>
                    <select
                      id="edit-network-type"
                      className="edit-form-select"
                      value={editNetworkType}
                      onChange={(e) => setEditNetworkType(e.target.value as NetworkType)}
                      disabled={isSavingEdits}
                    >
                      <option value="all-network">All-Network Cashless</option>
                      <option value="restricted-network">Restricted Network Only</option>
                      <option value="reimbursement-only">Reimbursement Only</option>
                    </select>
                  </div>
                </div>

                {/* Proportionate Deduction Toggle */}
                <div className="edit-form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div>
                    <label htmlFor="edit-prop-ded" style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151', cursor: 'pointer' }}>
                      Proportionate Deduction Clause
                    </label>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                      Reduces surgeon/OT fees proportionally if room limit is breached.
                    </div>
                  </div>
                  <input
                    id="edit-prop-ded"
                    type="checkbox"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={editProportionateDeduction}
                    onChange={(e) => setEditProportionateDeduction(e.target.checked)}
                    disabled={isSavingEdits}
                  />
                </div>
              </div>

              <div className="edit-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSavingEdits}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingEdits}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSavingEdits ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving changes…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <footer className="summary-sticky-action-bar">
        <div className="summary-sticky-inner">
          <div className="sticky-status-text">
            {isPolicyValid ? (
              <div className="sticky-verified-label">
                <CheckCircle2 size={18} className="text-primary" />
                <span>Policy terms confirmed — ready for hospital comparison</span>
              </div>
            ) : (
              <div className="sticky-invalid-label">
                <AlertOctagon size={18} className="text-danger" />
                <span>Policy document is missing required terms — upload schedule or edit values</span>
              </div>
            )}
          </div>

          <div className="sticky-btn-group">
            <button
              type="button"
              className="btn-continue-primary"
              disabled={!isPolicyValid || isSubmitting}
              onClick={handleContinue}
            >
              {isSubmitting ? (
                'Saving…'
              ) : isPolicyValid ? (
                <>
                  Confirm & Continue <ArrowRight size={18} />
                </>
              ) : (
                'Cannot Continue (Missing Required Terms)'
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
