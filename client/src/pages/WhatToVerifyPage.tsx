import React, { useState } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';

interface WhatToVerifyPageProps {
  policy?: PolicyDocument | null;
  onNavigateToSimulator?: () => void;
  onNavigateToHospitals?: () => void;
}

interface ChecklistItem {
  id: string;
  category: 'preadmission' | 'admission' | 'discharge';
  title: string;
  description: string;
  criticality: 'High' | 'Medium' | 'Standard';
  questionToAsk: string;
}

export const WhatToVerifyPage: React.FC<WhatToVerifyPageProps> = ({
  policy,
  onNavigateToSimulator,
  onNavigateToHospitals
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    pa1: true,
    pa2: true
  });

  const checklist: ChecklistItem[] = [
    {
      id: 'pa1',
      category: 'preadmission',
      title: 'Cashless Empanelment Confirmation',
      description: 'Confirm that the hospital is actively empanelled with your specific insurer and TPA for cashless hospitalization.',
      criticality: 'High',
      questionToAsk: 'Is my cashless card / policy active directly with your insurance desk, or is reimbursement required?'
    },
    {
      id: 'pa2',
      category: 'preadmission',
      title: 'Room Category Allotted vs Policy Cap',
      description: 'Ensure the room allocated does not exceed your policy room rent limit to avoid proportionate deductions.',
      criticality: 'High',
      questionToAsk: 'What is the exact room category written on the pre-authorization request form?'
    },
    {
      id: 'pa3',
      category: 'preadmission',
      title: 'Pre-Authorization Initial Approval (RAL)',
      description: 'Obtain the Request Authorization Letter (RAL) showing the initially approved cashless amount before planned admission.',
      criticality: 'High',
      questionToAsk: 'Has the TPA issued the initial sanction letter and what is the sanctioned initial sum?'
    },
    {
      id: 'ad1',
      category: 'admission',
      title: 'Package vs Non-Package Billing Terms',
      description: 'Ascertain whether the surgery/procedure is billed under an all-inclusive fixed package or separate itemized billing.',
      criticality: 'Medium',
      questionToAsk: 'Does the package rate include OT consumables, surgeon fees, and anesthesia?'
    },
    {
      id: 'ad2',
      category: 'admission',
      title: 'Non-Payables & Consumables Estimate',
      description: 'Non-medical items (gloves, PPE kits, nebulizer masks, admission kits) are typically excluded from insurance payments.',
      criticality: 'Medium',
      questionToAsk: 'What is the estimated non-payable consumable charge that must be paid at discharge?'
    },
    {
      id: 'dc1',
      category: 'discharge',
      title: 'Final Bill vs Initial Approval Reconciliation',
      description: 'Hospital submits final discharge summary to TPA for final cashless settlement. Allow 3 to 5 hours for final signoff.',
      criticality: 'High',
      questionToAsk: 'Has the final bill query from the insurer TPA desk been responded to by billing?'
    },
    {
      id: 'dc2',
      category: 'discharge',
      title: 'Proportionate Deduction Audit',
      description: 'Review the settlement voucher to ensure no incorrect room-linked deductions were applied if you stayed within your cap.',
      criticality: 'High',
      questionToAsk: 'Can you provide the detailed deduction breakdown voucher issued by the insurer?'
    }
  ];

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalCount = checklist.length;
  const verifiedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = Math.round((verifiedCount / totalCount) * 100);

  return (
    <div className="what-to-verify-view">
      {/* Top Hero Banner */}
      <section className="verify-hero-banner">
        <div className="verify-hero-content">
          <div className="verify-badge">
            <ShieldCheck size={16} />
            <span>Insurance Verification Protocol</span>
          </div>
          <h2 className="verify-title">Questions to Ask Before & During Hospitalization</h2>
          <p className="verify-desc">
            SehatSure identifies policy terms and estimated costs. However, hospital billing policies and TPA approvals require human confirmation. Use this checklist at the hospital insurance / TPA desk to avoid unexpected out-of-pocket charges.
          </p>

          {policy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-exact">
                Policy: <strong>{policy.insurer}</strong>
              </span>
              <span className="badge badge-tier">
                Plan: <strong>{policy.planName}</strong>
              </span>
              {onNavigateToSimulator && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onNavigateToSimulator}
                  style={{ marginLeft: '4px' }}
                >
                  Simulate Financial Impact →
                </button>
              )}
              {onNavigateToHospitals && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onNavigateToHospitals}
                >
                  Find Hospitals →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="verify-progress-card">
          <div className="progress-label-row">
            <span className="p-title">Verification Checklist</span>
            <span className="p-count">
              <strong>{verifiedCount}</strong> / {totalCount} Completed
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="progress-hint">
            {verifiedCount === totalCount
              ? 'All pre-admission checkpoints reviewed!'
              : 'Complete key verification steps before admission.'}
          </p>
        </div>
      </section>

      {/* Checklist Sections */}
      <div className="verify-grid">
        {/* Pre-Admission Stage */}
        <div className="verify-stage-block">
          <div className="stage-header">
            <div className="stage-pill">Phase 01</div>
            <h3>Pre-Admission & Cashless Desk</h3>
          </div>

          <div className="checklist-items">
            {checklist
              .filter((c) => c.category === 'preadmission')
              .map((item) => {
                const isDone = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`verify-item-card ${isDone ? 'checked' : ''}`}
                    onClick={() => toggleCheck(item.id)}
                    role="checkbox"
                    aria-checked={isDone}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && toggleCheck(item.id)}
                  >
                    <div className="verify-checkbox-col">
                      {isDone ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="verify-content-col">
                      <div className="verify-item-top">
                        <h4 className="verify-item-title">{item.title}</h4>
                        <span className={`criticality-tag ${item.criticality.toLowerCase()}`}>
                          {item.criticality} Priority
                        </span>
                      </div>
                      <p className="verify-item-desc">{item.description}</p>
                      <div className="question-to-ask-box">
                        <PhoneCall size={14} className="q-icon" />
                        <span className="q-label">Ask the TPA Desk:</span>
                        <span className="q-text">&ldquo;{item.questionToAsk}&rdquo;</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Admission & Billing Terms */}
        <div className="verify-stage-block">
          <div className="stage-header">
            <div className="stage-pill">Phase 02</div>
            <h3>Admission & Package Inclusions</h3>
          </div>

          <div className="checklist-items">
            {checklist
              .filter((c) => c.category === 'admission')
              .map((item) => {
                const isDone = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`verify-item-card ${isDone ? 'checked' : ''}`}
                    onClick={() => toggleCheck(item.id)}
                    role="checkbox"
                    aria-checked={isDone}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && toggleCheck(item.id)}
                  >
                    <div className="verify-checkbox-col">
                      {isDone ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="verify-content-col">
                      <div className="verify-item-top">
                        <h4 className="verify-item-title">{item.title}</h4>
                        <span className={`criticality-tag ${item.criticality.toLowerCase()}`}>
                          {item.criticality} Priority
                        </span>
                      </div>
                      <p className="verify-item-desc">{item.description}</p>
                      <div className="question-to-ask-box">
                        <PhoneCall size={14} className="q-icon" />
                        <span className="q-label">Ask the TPA Desk:</span>
                        <span className="q-text">&ldquo;{item.questionToAsk}&rdquo;</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Discharge & Settlement Audit */}
        <div className="verify-stage-block">
          <div className="stage-header">
            <div className="stage-pill">Phase 03</div>
            <h3>Discharge Bill Audit & Settlement</h3>
          </div>

          <div className="checklist-items">
            {checklist
              .filter((c) => c.category === 'discharge')
              .map((item) => {
                const isDone = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={`verify-item-card ${isDone ? 'checked' : ''}`}
                    onClick={() => toggleCheck(item.id)}
                    role="checkbox"
                    aria-checked={isDone}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && toggleCheck(item.id)}
                  >
                    <div className="verify-checkbox-col">
                      {isDone ? (
                        <CheckSquare size={20} className="text-primary" />
                      ) : (
                        <Square size={20} className="text-muted" />
                      )}
                    </div>
                    <div className="verify-content-col">
                      <div className="verify-item-top">
                        <h4 className="verify-item-title">{item.title}</h4>
                        <span className={`criticality-tag ${item.criticality.toLowerCase()}`}>
                          {item.criticality} Priority
                        </span>
                      </div>
                      <p className="verify-item-desc">{item.description}</p>
                      <div className="question-to-ask-box">
                        <PhoneCall size={14} className="q-icon" />
                        <span className="q-label">Ask the TPA Desk:</span>
                        <span className="q-text">&ldquo;{item.questionToAsk}&rdquo;</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Bottom Guidance Box */}
      <section className="verify-disclaimer-card">
        <div className="disc-header">
          <Info size={16} className="text-primary" />
          <strong>Important Healthcare Decision-Support Guidance</strong>
        </div>
        <p>
          SehatSure does not issue binding cashless pre-authorizations or adjudicate final insurance claims.
          Final claim payments are determined exclusively by your insurer (or Third Party Administrator) and the treating hospital according to the registered policy contract and actual itemized treatment records.
        </p>
      </section>
    </div>
  );
};
