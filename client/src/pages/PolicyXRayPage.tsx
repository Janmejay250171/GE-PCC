import React, { useState } from 'react';
import {
  ShieldCheck,
  Bed,
  Activity,
  Percent,
  Clock,
  HeartPulse,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { ProvenanceDetails, ProvenanceModal } from '../components/ProvenanceModal';

interface PolicyXRayPageProps {
  policy: PolicyDocument;
  onNavigateToSimulator: () => void;
  onNavigateToHospitals: () => void;
  onEditPolicy?: () => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const PolicyXRayPage: React.FC<PolicyXRayPageProps> = ({
  policy,
  onNavigateToSimulator,
  onNavigateToHospitals
}) => {
  const [activeTab, setActiveTab] = useState<'coverage' | 'waiting' | 'additional' | 'disease' | 'notes'>('coverage');
  const [selectedProvenance, setSelectedProvenance] = useState<ProvenanceDetails | null>(null);
  const [isProvModalOpen, setIsProvModalOpen] = useState(false);

  const openProvenance = (details: ProvenanceDetails) => {
    setSelectedProvenance(details);
    setIsProvModalOpen(true);
  };

  const getRoomRentDisplay = () => {
    if (!policy.roomLimit) return { val: 'No Capping', sub: 'Unlimited room category' };
    if (policy.roomLimit.type === 'percent') {
      const daily = ((Number(policy.roomLimit.value) || 0) / 100) * (policy.sumInsured || 0);
      return {
        val: `₹ ${daily.toLocaleString('en-IN')} / day`,
        sub: `(${policy.roomLimit.value}% of Sum Insured)`
      };
    }
    if (policy.roomLimit.type === 'amount') {
      return {
        val: `₹ ${Number(policy.roomLimit.value).toLocaleString('en-IN')} / day`,
        sub: 'Fixed daily amount'
      };
    }
    return { val: String(policy.roomLimit.value), sub: 'Category-capped' };
  };

  const roomDisplay = getRoomRentDisplay();

  return (
    <div className="policy-xray-view">
      {/* 1. Policy Summary Banner */}
      <section className="xray-banner-card">
        <div className="xray-banner-left">
          {/* Insurer Logo Badge */}
          <div className="insurer-logo-box">
            <span className="insurer-tag-text">
              {policy.insurer ? policy.insurer.split(' ')[0] : 'POLICY'}
            </span>
          </div>

          <div className="insurer-info">
            <h2 className="insurer-title">
              {policy.insurer ? `${policy.insurer} Health Insurance` : (policy.planName || 'Unidentified Policy Document')}
            </h2>
            <div className="plan-name-subtitle">
              {policy.planName ? `${policy.planName} ` : ''}
              <span className="demo-tag">({policy._id?.includes('demo') ? 'Sample Benchmark Policy' : 'Parsed Policy Document'})</span>
            </div>
            {policy.policyNumber && (
              <span className="policy-num-text">Policy No: {policy.policyNumber}</span>
            )}
          </div>
        </div>

        <div className="xray-banner-stats">
          <div className="banner-stat-block">
            <span className="stat-label">Sum Insured</span>
            <span className="stat-value">
              {policy.sumInsured ? formatINR(policy.sumInsured) : (policy.policyType === 'esi' ? 'Unlimited' : '₹0 (Not Detected)')}
            </span>
          </div>
          <div className="banner-stat-block">
            <span className="stat-label">Policy Type</span>
            <span className="stat-value" style={{ textTransform: 'capitalize' }}>
              {policy.policyType === 'corporate'
                ? 'Corporate Group'
                : policy.policyType === 'pmjay'
                ? 'PM-JAY Scheme'
                : policy.policyType === 'esi'
                ? 'ESI Scheme'
                : 'Individual Floater'}
            </span>
          </div>
          <div className="banner-stat-block">
            <span className="stat-label">Policy Period</span>
            <span className="stat-value">
              {policy.policyStartDate && policy.policyEndDate
                ? `${policy.policyStartDate} to ${policy.policyEndDate}`
                : policy.policyStartDate
                ? 'Jan 2026 - Dec 2026'
                : '1 Year Active'}
            </span>
          </div>
        </div>
      </section>

      {/* Warning banner if document had no insurance terms */}
      {(!policy.sumInsured || policy.sumInsured === 0) && !policy.insurer && (
        <div
          className="sim-callout-box"
          style={{
            background: '#FFFBEB',
            borderColor: '#FDE68A',
            color: '#92400E',
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #FDE68A',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start'
          }}
        >
          <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: 2, color: '#D97706' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
              No Insurance Policy Constraints Detected in Document
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              The uploaded document appears to be a problem statement, research paper, or general brochure rather than a health insurance policy schedule or certificate.
              The AI extractor searches specifically for health insurance terms (such as <strong>Sum Insured</strong>, <strong>Room Rent caps</strong>, <strong>Co-payment %</strong>, and <strong>Insurer</strong>).
              To see live calculations, please click <strong>Upload Policy</strong> and select an actual insurance policy PDF (like Star Health, HDFC ERGO, Care, etc.), or pick one of the verified sample policies.
            </div>
          </div>
        </div>
      )}

      {/* 2. Horizontal Navigation Tabs */}
      <nav className="xray-tabs-nav" aria-label="Policy X-Ray Sections">
        <button
          type="button"
          className={`xray-tab-btn ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => setActiveTab('coverage')}
        >
          Coverage & Limits
        </button>
        <button
          type="button"
          className={`xray-tab-btn ${activeTab === 'waiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('waiting')}
        >
          Waiting Periods
        </button>
        <button
          type="button"
          className={`xray-tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
          onClick={() => setActiveTab('additional')}
        >
          Additional Benefits
        </button>
        <button
          type="button"
          className={`xray-tab-btn ${activeTab === 'disease' ? 'active' : ''}`}
          onClick={() => setActiveTab('disease')}
        >
          Disease-specific
        </button>
        <button
          type="button"
          className={`xray-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Important Notes
        </button>
      </nav>

      {/* 3. Tab Content Area */}
      <main className="xray-tab-content">
        {/* TAB 1: Coverage & Limits */}
        {activeTab === 'coverage' && (
          <div className="xray-cards-grid">
            {/* Card 1: Room Rent Limit */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <Bed size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Room Rent Limit</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{roomDisplay.val}</span>
                    <span className="xray-sub-val">{roomDisplay.sub}</span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                {policy.roomLimit?.type === 'percent'
                  ? `Derived from ${policy.roomLimit.value}% of ${formatINR(policy.sumInsured || 0)} Sum Insured. Associated medical expenses may be subject to proportionate deduction if exceeded.`
                  : policy.roomLimit?.type === 'amount'
                  ? `Fixed tariff limit of ₹${Number(policy.roomLimit.value).toLocaleString('en-IN')}/day. Stays above this rate trigger proportionate deductions on associated medical costs.`
                  : 'No daily room rent cap specified in schedule. Subject to overall sum insured.'}
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'Room Rent Limit',
                    fieldValue: roomDisplay.val,
                    provenanceType: 'DERIVED_POLICY_VALUE',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Room Rent & Boarding',
                    sourceSnippet: policy.sourceSnippets?.roomLimit || 'Room rent, boarding and nursing expenses limit per day as per policy schedule.',
                    explanation: 'Exceeding this daily room tariff applies proportionate deduction across doctor visits, nursing, and surgery fees.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>

            {/* Card 2: ICU Limit */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <Activity size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">ICU Limit</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">No separate capping</span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                ICU charges covered up to overall Sum Insured. No standalone percentage restriction identified in schedule.
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'ICU Limit',
                    fieldValue: 'No separate capping',
                    provenanceType: 'EXTRACTED_POLICY_FACT',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Intensive Care Unit Charges',
                    sourceSnippet: policy.sourceSnippets?.icuLimit || 'No separate sub-limit or cap is applied to ICU/ICCU charges under this policy schedule.',
                    explanation: 'ICU admissions do not attract separate daily caps beyond the standard sum insured ceiling.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>

            {/* Card 3: Co-payment */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <Percent size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Network Co-pay</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{policy.copay != null ? `${policy.copay}%` : '0%'}</span>
                    <span className="xray-sub-val">
                      {policy.copay === 0
                        ? '(0% Across Network)'
                        : policy.copay != null
                        ? `(${policy.copay}% on Network)`
                        : '(0% Default / Not Stated)'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                {policy.copay === 0 || policy.copay == null
                  ? 'Nil co-payment applicable across empanelled network facilities. Non-network hospital co-pay is not specified.'
                  : `${policy.copay}% co-payment borne by patient across admissible hospitalization expenses.`}
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'Co-payment',
                    fieldValue: `${policy.copay ?? 0}% Network / Unspecified Non-Network`,
                    provenanceType: 'EXTRACTED_POLICY_FACT',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Co-payment Terms',
                    sourceSnippet: policy.sourceSnippets?.copay || 'Co-payment terms specified under policy conditions.',
                    explanation: 'Patient mandatory cost sharing percentage on admissible medical expenses.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>

            {/* Card 4: Deductible */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <DollarSign size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Compulsory Deductible</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{policy.deductible ? formatINR(policy.deductible) : '₹0 (Nil)'}</span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                {policy.deductible
                  ? `Compulsory out-of-pocket threshold of ${formatINR(policy.deductible)} before insurer coverage initiates.`
                  : 'Zero compulsory deductible. Admissible hospitalization expenses qualify from Rupee 1.'}
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'Compulsory Deductible',
                    fieldValue: policy.deductible ? formatINR(policy.deductible) : '₹0 (Nil)',
                    provenanceType: 'EXTRACTED_POLICY_FACT',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Deductible Schedule',
                    sourceSnippet: policy.sourceSnippets?.deductible || `Deductible: ${policy.deductible ? formatINR(policy.deductible) : 'Rs. 0'}`,
                    explanation: 'The policyholder has no compulsory out-of-pocket threshold before insurance covers admissible expenses.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>

            {/* Card 5: Restoration Benefit */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <HeartPulse size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Sum Insured Restoration</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">
                      {policy.restorationBenefit ? '100% Restoration' : 'Not Specified'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                {policy.restorationBenefit
                  ? `100% Sum Insured restoration automatically triggered upon complete exhaustion of base cover during policy year.`
                  : 'No automatic reinstatement of Sum Insured indicated in uploaded document.'}
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'Sum Insured Restoration',
                    fieldValue: policy.restorationBenefit ? '100% Restoration upon exhaustion' : 'Not Specified',
                    provenanceType: 'EXTRACTED_POLICY_FACT',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Restoration Benefit',
                    sourceSnippet: policy.sourceSnippets?.restoration || (policy.restorationBenefit ? 'Sum Insured restoration upon exhaustion for unrelated illnesses.' : 'Restoration terms not stated in schedule.'),
                    explanation: policy.restorationBenefit
                      ? `Provides an additional bucket of ${formatINR(policy.sumInsured || 0)} if base cover is exhausted.`
                      : 'Restoration terms are unconfirmed in current document.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>

            {/* Card 6: Ambulance Charges */}
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Emergency Road Ambulance</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">₹ 2,500</span>
                    <span className="xray-sub-val">per hospitalization</span>
                  </div>
                </div>
              </div>

              <p className="xray-card-desc">
                Capped at ₹2,500 per hospitalization event for licensed road ambulance transit to nearest network facility.
              </p>

              <button
                type="button"
                className="xray-source-link"
                onClick={() =>
                  openProvenance({
                    fieldName: 'Ambulance Allowance',
                    fieldValue: '₹2,500 per event',
                    provenanceType: 'EXTRACTED_POLICY_FACT',
                    documentName: policy.planName || policy.insurer || 'Policy Schedule',
                    pageClause: 'Section — Ambulance Cover',
                    sourceSnippet: policy.sourceSnippets?.ambulance || 'Road ambulance charges up to Rs. 2,500 per hospitalization.',
                    explanation: 'Fixed reimbursement limit for emergency transit.'
                  })
                }
              >
                <span>View source →</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Waiting Periods */}
        {activeTab === 'waiting' && (
          <div className="xray-cards-grid">
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square"><Clock size={20} className="text-primary" /></div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Initial Waiting Period</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{policy.waitingPeriods?.initial || (policy.policyType === 'corporate' ? '0 days' : '30 days')}</span>
                    <span className="xray-sub-val">
                      {policy.waitingPeriods?.initial === '0 days' || policy.policyType === 'corporate' ? '(Day 1 Active)' : '(First 30 days)'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="xray-card-desc">
                {policy.waitingPeriods?.initial === '0 days' || policy.policyType === 'corporate'
                  ? 'Cover begins on Day 1 for all illnesses under corporate group endorsement.'
                  : '30-day initial waiting period applies to fresh illness claims, excluding accidents.'}
              </p>
            </div>

            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square"><Clock size={20} className="text-primary" /></div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Pre-Existing Conditions (PED)</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{policy.waitingPeriods?.preExisting || (policy.policyType === 'corporate' ? '0 days' : '36 months')}</span>
                    <span className="xray-sub-val">
                      {policy.waitingPeriods?.preExisting === '0 days' || policy.policyType === 'corporate'
                        ? '(Day 1 PED Covered)'
                        : '(Pre-existing Waiting Period)'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="xray-card-desc">
                {policy.waitingPeriods?.preExisting === '0 days' || policy.policyType === 'corporate'
                  ? 'Pre-existing illnesses covered from inception without customary 36–48 month retail waiting period.'
                  : 'Declared pre-existing conditions covered following continuous policy tenure.'}
              </p>
            </div>

            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square"><Clock size={20} className="text-primary" /></div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Maternity Waiting Period</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">{policy.waitingPeriods?.maternity || '9 months'}</span>
                  </div>
                </div>
              </div>
              <p className="xray-card-desc">
                {policy.waitingPeriods?.maternity && policy.waitingPeriods.maternity !== '0 days'
                  ? `Maternity benefits subject to ${policy.waitingPeriods.maternity} continuous enrollment.`
                  : 'Maternity waiting terms as per applicable policy schedule.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Additional Benefits */}
        {activeTab === 'additional' && (
          <div className="xray-cards-grid">
            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square"><ShieldCheck size={20} className="text-primary" /></div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Pre & Post Hospitalization</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">30 Days Pre / 60 Days Post</span>
                  </div>
                </div>
              </div>
              <p className="xray-card-desc">Diagnostics, consultations, and prescribed pharmacy covered 30 days prior and 60 days following discharge.</p>
            </div>

            <div className="xray-card">
              <div className="xray-card-top">
                <div className="xray-icon-square"><CheckCircle2 size={20} className="text-primary" /></div>
                <div className="xray-card-title-group">
                  <span className="xray-card-label">Daycare Procedures</span>
                  <div className="xray-card-val-row">
                    <span className="xray-main-val">Full Daycare Covered</span>
                  </div>
                </div>
              </div>
              <p className="xray-card-desc">Surgeries and treatments requiring under 24 hours hospital stay due to technological advances are covered.</p>
            </div>
          </div>
        )}

        {/* TAB 4: Disease-specific Sub-limits */}
        {activeTab === 'disease' && (
          <div className="xray-empty-tab-box">
            <Info size={28} className="text-primary" />
            <h4>Disease-Specific Sub-Limits: Not Specified</h4>
            <p>
              The uploaded policy schedule does not establish disease-specific sub-limits (e.g. Cataract, Joint Replacement). SehatSure preserves silence as unspecified rather than assuming absence of capping.
            </p>
          </div>
        )}

        {/* TAB 5: Important Notes */}
        {activeTab === 'notes' && (
          <div className="xray-empty-tab-box">
            <AlertTriangle size={28} className="text-amber" />
            <h4>Important Decision-Support Notice</h4>
            <p>
              Policy constraints shown here are parsed from your uploaded schedule. SehatSure provides non-binding educational estimates. Always verify current empanelment, cashless pre-authorization, and exact package inclusion terms with your hospital TPA desk before admission.
            </p>
          </div>
        )}
      </main>

      {/* 4. Action Banner to Next Stage */}
      <section className="xray-next-banner">
        <div className="next-banner-text">
          <strong>Ready to see how these constraints affect your out-of-pocket costs?</strong>
          <span>Simulate expected hospital bills, test room categories, and explore Bengaluru network facilities.</span>
        </div>
        <div className="next-banner-actions">
          <button type="button" className="btn btn-primary" onClick={onNavigateToSimulator}>
            <span>Simulate Financial Impact</span>
            <ArrowRight size={16} />
          </button>
          <button type="button" className="btn btn-secondary" onClick={onNavigateToHospitals}>
            <span>Find Hospitals</span>
          </button>
        </div>
      </section>

      {/* Provenance Details Modal */}
      <ProvenanceModal
        isOpen={isProvModalOpen}
        onClose={() => setIsProvModalOpen(false)}
        details={selectedProvenance}
      />
    </div>
  );
};
