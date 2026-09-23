import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Bed,
  FileText,
  DollarSign,
  Activity,
  HeartPulse,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { RankedHospitalItem, RoomCategory, PolicyImpactBreakdown } from '../types/hospital';
import { fetchHospitalBreakdown } from '../services/hospitalApi';

export type CareJourneyStage =
  | 'PRE-ADMISSION'
  | 'ADMISSION'
  | 'INVESTIGATION'
  | 'PROCEDURE'
  | 'RECOVERY';

interface CareJourneyPageProps {
  policy: PolicyDocument;
  hospital: RankedHospitalItem;
  initialRoom?: RoomCategory;
  initialProcedure?: string;
  onBackToDiscovery: () => void;
  onBackToPolicy: () => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const CareJourneyPage: React.FC<CareJourneyPageProps> = ({
  policy,
  hospital,
  initialRoom = 'General Ward',
  initialProcedure = '',
  onBackToDiscovery,
  onBackToPolicy
}) => {
  const [currentStage, setCurrentStage] = useState<CareJourneyStage>('PRE-ADMISSION');
  const [selectedRoom, setSelectedRoom] = useState<RoomCategory>(initialRoom);
  const [breakdown, setBreakdown] = useState<PolicyImpactBreakdown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Checkbox tracker for interactive checklists
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCompletedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Re-fetch breakdown whenever selectedRoom changes
  useEffect(() => {
    let isCancelled = false;
    async function loadBreakdown() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHospitalBreakdown({
          policyId: policy._id,
          policy,
          hospitalName: hospital.hospital.hospital_name,
          hospitalAddress: hospital.hospital.address,
          city: hospital.hospital.city,
          hospitalId: hospital.hospital.hospital_id,
          specialty: hospital.hospital.specialties?.[0],
          procedure: initialProcedure || undefined,
          roomType: selectedRoom
        });
        if (!isCancelled) {
          setBreakdown(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load policy calculation for this room.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadBreakdown();
    return () => {
      isCancelled = true;
    };
  }, [selectedRoom, policy, hospital, initialProcedure]);

  const h = hospital.hospital;

  // Determine policy room limit display
  const getRoomLimitText = () => {
    if (!policy.roomLimit) return 'No limit specified in policy';
    if (policy.roomLimit.type === 'percent') {
      const dailyVal = (Number(policy.roomLimit.value) / 100) * (policy.sumInsured || 0);
      return `${policy.roomLimit.value}% of SI (₹${dailyVal.toLocaleString('en-IN')}/day)`;
    }
    if (policy.roomLimit.type === 'amount') {
      return `₹${Number(policy.roomLimit.value).toLocaleString('en-IN')}/day`;
    }
    return String(policy.roomLimit.value);
  };

  const stages: { id: CareJourneyStage; title: string; num: number; icon: any }[] = [
    { id: 'PRE-ADMISSION', title: 'Pre-Admission', num: 1, icon: FileText },
    { id: 'ADMISSION', title: 'Admission', num: 2, icon: Bed },
    { id: 'INVESTIGATION', title: 'Investigation', num: 3, icon: Activity },
    { id: 'PROCEDURE', title: 'Procedure / Care', num: 4, icon: HeartPulse },
    { id: 'RECOVERY', title: 'Recovery / Discharge', num: 5, icon: CheckCircle2 }
  ];

  return (
    <div className="care-journey-container">
      {/* Top Navigation & Breadcrumb */}
      <div className="journey-top-bar">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBackToDiscovery}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={15} />
            <span>Back to Hospital Results</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBackToPolicy}
          >
            <span>Review Policy Terms</span>
          </button>
        </div>

        <div className="journey-context-tags">
          <span className="badge badge-tier">
            City: <strong>{h.city}</strong>
          </span>
          <span className="badge badge-specialty">
            Specialty: <strong>{h.specialties?.[0] || 'General Healthcare'}</strong> • Dataset Listed
          </span>
          <span className="badge badge-exact">
            Network: <strong>{policy.insurer} Reference Match</strong>
          </span>
        </div>
      </div>

      {/* Hospital Banner */}
      <section className="journey-hospital-card">
        <div className="journey-hospital-main">
          <div className="hospital-icon-wrap">
            <Building2 size={28} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="journey-hospital-name">{h.hospital_name}</h2>
              <span className="rating-badge">★ {h.rating > 0 ? h.rating.toFixed(1) : 'Unrated'}</span>
              <span className="badge badge-segment">{h.segment}</span>
              <span className="badge badge-tier">{h.tier}</span>
            </div>
            <p className="journey-hospital-address">
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {h.address}
            </p>
          </div>
        </div>

        <div className="journey-policy-summary">
          <div className="policy-stat-item">
            <span className="policy-stat-label">Insurer Policy</span>
            <span className="policy-stat-value">{policy.insurer}</span>
          </div>
          <div className="policy-stat-item">
            <span className="policy-stat-label">Sum Insured</span>
            <span className="policy-stat-value">{formatINR(policy.sumInsured || 0)}</span>
          </div>
          <div className="policy-stat-item">
            <span className="policy-stat-label">Room Limit</span>
            <span className="policy-stat-value">{getRoomLimitText()}</span>
          </div>
          <div className="policy-stat-item">
            <span className="policy-stat-label">Network Co-pay</span>
            <span className="policy-stat-value">{policy.copay ?? 0}%</span>
          </div>
        </div>
      </section>

      {/* Error state if breakdown failed */}
      {error && (
        <div className="alert-card alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Room Category Live Switcher */}
      <section className="journey-room-switcher-card">
        <div className="room-switcher-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bed size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              Interactive Room Category & Financial Impact
            </h3>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-subtle)' }}>
            Switching category dynamically recalculates patient exposure across all care stages.
          </span>
        </div>

        <div className="room-buttons-grid">
          {(['General Ward', 'Twin Sharing', 'Single Private Room'] as RoomCategory[]).map(r => {
            const isSelected = selectedRoom === r;
            return (
              <button
                key={r}
                type="button"
                className={`room-select-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedRoom(r)}
              >
                <div className="room-btn-title">{r}</div>
                <div className="room-btn-sub">
                  {r === 'General Ward'
                    ? 'Within ₹5,000/day policy cap'
                    : r === 'Twin Sharing'
                    ? 'Moderate daily tariff'
                    : 'Potential proportionate deduction'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Calculation Strip */}
        {breakdown && !loading && (
          <div className="journey-calc-strip">
            <div className="calc-cell">
              <span className="calc-cell-label">Room Tariff (Est.)</span>
              <span className="calc-cell-value">
                {formatINR(breakdown.itemizedBill.roomRatePerDay)}/day
              </span>
              <span className="calc-cell-hint">
                Limit: {formatINR(breakdown.roomLimitEligiblePerDay)}/day
              </span>
            </div>

            <div className="calc-cell">
              <span className="calc-cell-label">Room Excess</span>
              <span className={`calc-cell-value ${breakdown.totalRoomRentExcess > 0 ? 'text-amber' : ''}`}>
                {breakdown.totalRoomRentExcess > 0 ? formatINR(breakdown.totalRoomRentExcess) : '₹0 (None)'}
              </span>
              <span className="calc-cell-hint">
                {breakdown.roomRentExcessPerDay > 0
                  ? `₹${breakdown.roomRentExcessPerDay}/day × ${breakdown.itemizedBill.stayDays} days`
                  : 'Fully within room limit'}
              </span>
            </div>

            <div className="calc-cell">
              <span className="calc-cell-label">Proportionate Disallowance</span>
              <span className={`calc-cell-value ${breakdown.proportionateDisallowance > 0 ? 'text-danger' : ''}`}>
                {breakdown.proportionateDisallowance > 0 ? formatINR(breakdown.proportionateDisallowance) : '₹0'}
              </span>
              <span className="calc-cell-hint">
                {breakdown.proportionateDeductionActive
                  ? 'Applied to associated expenses'
                  : 'No proportionate breach'}
              </span>
            </div>

            <div className="calc-cell">
              <span className="calc-cell-label">Estimated Patient Share</span>
              <span className="calc-cell-value text-primary font-bold">
                {formatINR(breakdown.totalPatientPayable)}
              </span>
              <span className="calc-cell-hint">
                Insurer Share: {formatINR(breakdown.totalInsuranceCovered)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5-Stage Stepper Navigation */}
      <nav className="journey-stages-nav" aria-label="Care Journey Stages">
        {stages.map(s => {
          const isActive = currentStage === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              className={`journey-stage-tab ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentStage(s.id)}
            >
              <div className="stage-tab-num">{s.num}</div>
              <div className="stage-tab-content">
                <span className="stage-tab-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={15} />
                  {s.title}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Stage Content Area */}
      <main className="journey-stage-body">
        {/* STAGE 1: PRE-ADMISSION */}
        {currentStage === 'PRE-ADMISSION' && (
          <div className="stage-content-section">
            <div className="stage-header">
              <h3>Stage 1: Pre-Admission Verification & Pre-Authorization</h3>
              <p className="stage-sub">
                Critical insurance checkpoints to complete 48 to 24 hours prior to planned hospitalization.
              </p>
            </div>

            <div className="stage-cards-grid">
              {/* Checkpoint 1: Cashless & Empanelment */}
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <ShieldCheck size={20} color="var(--color-primary)" />
                  <h4>1. Empanelment & Cashless Status</h4>
                </div>
                <div className="provenance-banner">
                  <strong>Network Match:</strong> Hospital is listed under {policy.insurer} in SehatSure's reference dataset.
                  <div style={{ marginTop: '4px', fontSize: '0.82rem', color: 'var(--color-text-subtle)' }}>
                    Confirm cashless desk active eligibility with TPA Vidal Health TPA before admission.
                  </div>
                </div>

                <div className="checklist-group">
                  <div className="checklist-header">Action Items for Policyholder:</div>
                  <label className="checklist-item" onClick={() => toggleCheck('pre_1')}>
                    {completedItems['pre_1'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Submit Pre-Authorization form to hospital insurance/TPA desk 48h prior.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('pre_2')}>
                    {completedItems['pre_2'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Provide Doctor's clinical advice note with tentative date and diagnosis.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('pre_3')}>
                    {completedItems['pre_3'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Carry original Government Photo ID and Health e-Card.</span>
                  </label>
                </div>
              </div>

              {/* Checkpoint 2: Room Limit & Exposure */}
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <Bed size={20} color="var(--color-primary)" />
                  <h4>2. Selected Room Rent Alignment</h4>
                </div>
                <div className="info-kv-list">
                  <div className="info-kv-row">
                    <span>Policy Room Limit:</span>
                    <strong>{getRoomLimitText()}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Selected Room:</span>
                    <strong>{selectedRoom}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Indicative Daily Tariff:</span>
                    <strong>{breakdown ? formatINR(breakdown.itemizedBill.roomRatePerDay) : '...'}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Proportionate Deduction Risk:</span>
                    <strong style={{ color: breakdown?.proportionateDisallowance ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                      {breakdown?.proportionateDisallowance ? 'Active (Room tariff exceeds limit)' : 'None (Within eligible limit)'}
                    </strong>
                  </div>
                </div>

                <div className="alert-card alert-info" style={{ marginTop: '14px', fontSize: '0.85rem' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <div>
                    If you choose a room above ₹5,000/day, proportionate deduction will apply to doctor fees, nursing, and operation charges.
                  </div>
                </div>
              </div>
            </div>

            {/* Questions to Ask Hospital & TPA */}
            <div className="stage-questions-box">
              <div className="questions-box-title">
                <HelpCircle size={18} color="var(--color-primary)" />
                <h4>Questions to Ask Hospital TPA Desk Before Admission</h4>
              </div>
              <ul className="questions-list">
                <li>
                  <strong>"Is cashless pre-authorization active for HDFC ERGO under TPA Vidal Health?"</strong>
                  <p>Confirms whether direct cashless settlement is enabled or if initial security deposit is mandated.</p>
                </li>
                <li>
                  <strong>"What is the exact all-inclusive daily tariff for a {selectedRoom}?"</strong>
                  <p>Ensure that nursing charges, RMO fees, and bed charges do not push the daily rate past ₹5,000/day.</p>
                </li>
                <li>
                  <strong>"Does this procedure have a fixed package tariff, and what consumables are excluded?"</strong>
                  <p>Inquire whether administrative items, sanitizers, gloves, and luxury linen are billed outside the cashless estimate.</p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STAGE 2: ADMISSION */}
        {currentStage === 'ADMISSION' && (
          <div className="stage-content-section">
            <div className="stage-header">
              <h3>Stage 2: Hospital Admission & Room Allocation</h3>
              <p className="stage-sub">
                Insurance-sensitive considerations when registering at the admission counter.
              </p>
            </div>

            <div className="stage-cards-grid">
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <Bed size={20} color="var(--color-primary)" />
                  <h4>Room Category Confirmation</h4>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Hospitals occasionally offer complimentary upgrades or assign premium rooms when standard wards are occupied.
                </p>
                <div className="alert-card alert-warning" style={{ fontSize: '0.85rem' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Caution regarding room upgrades:</strong> Insurers calculate proportionate deductions based on the actual tariff of the room occupied, regardless of whether the hospital provided a verbal upgrade. Always demand documentation if offered a courtesy upgrade.
                  </div>
                </div>

                <div className="checklist-group" style={{ marginTop: '16px' }}>
                  <div className="checklist-header">Admission Desk Checklist:</div>
                  <label className="checklist-item" onClick={() => toggleCheck('adm_1')}>
                    {completedItems['adm_1'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Verify that the admission slip states "{selectedRoom}" and not a higher tier.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('adm_2')}>
                    {completedItems['adm_2'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Confirm initial pre-auth approval letter amount received from TPA Vidal Health.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('adm_3')}>
                    {completedItems['adm_3'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Obtain signed initial estimate sheet from the hospital billing executive.</span>
                  </label>
                </div>
              </div>

              <div className="stage-info-card">
                <div className="stage-card-title">
                  <DollarSign size={20} color="var(--color-primary)" />
                  <h4>Financial Snapshot at Admission</h4>
                </div>
                {breakdown ? (
                  <div className="info-kv-list">
                    <div className="info-kv-row">
                      <span>Room Tariff per Day:</span>
                      <strong>{formatINR(breakdown.itemizedBill.roomRatePerDay)}</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Estimated Length of Stay:</span>
                      <strong>{breakdown.itemizedBill.stayDays} days</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Total Estimated Room Rent:</span>
                      <strong>{formatINR(breakdown.itemizedBill.roomCharges)}</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Initial TPA Security Deposit (Est.):</span>
                      <strong>₹5,000 – ₹10,000 (Refundable upon TPA settlement)</strong>
                    </div>
                  </div>
                ) : (
                  <p>Calculating estimates...</p>
                )}
              </div>
            </div>

            <div className="stage-questions-box">
              <div className="questions-box-title">
                <HelpCircle size={18} color="var(--color-primary)" />
                <h4>Questions to Ask at the Admission Counter</h4>
              </div>
              <ul className="questions-list">
                <li>
                  <strong>"Has the TPA initial authorization letter arrived, and what is the initial approved amount?"</strong>
                  <p>Insurers usually grant an initial approval (e.g. ₹50,000) at admission and enhance it prior to discharge.</p>
                </li>
                <li>
                  <strong>"Is there any mandatory out-of-pocket deposit for cashless patients?"</strong>
                  <p>Many hospitals ask for ₹5,000–₹10,000 for non-medical consumables not covered by policy.</p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STAGE 3: INVESTIGATION */}
        {currentStage === 'INVESTIGATION' && (
          <div className="stage-content-section">
            <div className="stage-header">
              <h3>Stage 3: Diagnostics & Pre-Hospitalization</h3>
              <p className="stage-sub">
                Pre-operative tests, imaging, and policy pre-hospitalization reimbursement rules.
              </p>
            </div>

            <div className="stage-cards-grid">
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <Activity size={20} color="var(--color-primary)" />
                  <h4>Pre-Hospitalization Window & Diagnostics</h4>
                </div>
                <div className="info-kv-list">
                  <div className="info-kv-row">
                    <span>Pre-Hospitalization Window:</span>
                    <strong>{policy.preHospitalizationDays || 30} Days Covered</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Initial Waiting Period:</span>
                    <strong>{policy.waitingPeriods?.initial ?? '0 days (Corporate Plan)'}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Diagnostics Share in Model:</span>
                    <strong>~10% of total estimated bill</strong>
                  </div>
                </div>

                <div className="alert-card alert-info" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Reimbursement Process:</strong> Diagnostic tests (blood panels, CT, MRI) performed prior to hospitalization are typically claimed via reimbursement after discharge, even if the hospitalization is cashless.
                  </div>
                </div>
              </div>

              <div className="stage-info-card">
                <div className="stage-card-title">
                  <FileText size={20} color="var(--color-primary)" />
                  <h4>Documentation Required for Diagnostics</h4>
                </div>
                <div className="checklist-group">
                  <label className="checklist-item" onClick={() => toggleCheck('inv_1')}>
                    {completedItems['inv_1'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Keep doctor's original written prescription advising each diagnostic test.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('inv_2')}>
                    {completedItems['inv_2'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Collect original itemized receipt and payment proof for each lab test.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('inv_3')}>
                    {completedItems['inv_3'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Retain complete diagnostic test report signed by the radiologist/pathologist.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="stage-questions-box">
              <div className="questions-box-title">
                <HelpCircle size={18} color="var(--color-primary)" />
                <h4>Questions to Ask Regarding Diagnostics</h4>
              </div>
              <ul className="questions-list">
                <li>
                  <strong>"Are in-hospital pre-operative labs included in the IPD cashless package?"</strong>
                  <p>Inquire whether lab work done on Day 1 is billed under the indoor cashless authorization or billed separately.</p>
                </li>
                <li>
                  <strong>"Are external scans (e.g. MRI/CT taken at an outside facility) documented on the doctor's chart?"</strong>
                  <p>Insurers require a direct clinical nexus between the outpatient test and the in-hospital diagnosis.</p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STAGE 4: PROCEDURE */}
        {currentStage === 'PROCEDURE' && (
          <div className="stage-content-section">
            <div className="stage-header">
              <h3>Stage 4: Surgical / Medical Procedure & In-Patient Care</h3>
              <p className="stage-sub">
                Indicative cost breakdown, policy sub-limits, and insurance coverage calculation.
              </p>
            </div>

            <div className="stage-cards-grid">
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <HeartPulse size={20} color="var(--color-primary)" />
                  <h4>Procedure Cost & Sub-Limit Check</h4>
                </div>

                <div className="info-kv-list">
                  <div className="info-kv-row">
                    <span>Clinical Specialty:</span>
                    <strong>{h.specialties?.[0] || 'General Healthcare'}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Procedure:</span>
                    <strong>{initialProcedure || 'Specialty In-Patient Care'}</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Disease-Specific Sub-Limits:</span>
                    <strong>Not specified in uploaded policy</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Network Hospital Co-pay:</span>
                    <strong>{policy.copay ?? 0}%</strong>
                  </div>
                </div>

                <div className="alert-card alert-info" style={{ marginTop: '14px', fontSize: '0.85rem' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Data Provenance:</strong> Procedure costs represent reference dataset estimates. Actual charges depend on surgical findings, implant selections, and clinical complexity.
                  </div>
                </div>
              </div>

              <div className="stage-info-card">
                <div className="stage-card-title">
                  <DollarSign size={20} color="var(--color-primary)" />
                  <h4>Model Bill Estimation Breakdown</h4>
                </div>

                {breakdown ? (
                  <div className="info-kv-list">
                    <div className="info-kv-row">
                      <span>Procedure / Surgery Charges:</span>
                      <strong>{formatINR(breakdown.itemizedBill.procedureCharges)}</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Doctor & Surgeon Consultation Fees:</span>
                      <strong>{formatINR(breakdown.itemizedBill.doctorFees)}</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Medicines & Pharmacy:</span>
                      <strong>{formatINR(breakdown.itemizedBill.medicineCharges)}</strong>
                    </div>
                    <div className="info-kv-row">
                      <span>Room Rent ({breakdown.itemizedBill.stayDays} days):</span>
                      <strong>{formatINR(breakdown.itemizedBill.roomCharges)}</strong>
                    </div>
                    <div className="info-kv-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                      <span style={{ fontWeight: 600 }}>Total Indicative Bill:</span>
                      <strong style={{ fontWeight: 700 }}>{formatINR(breakdown.itemizedBill.totalBill)}</strong>
                    </div>
                  </div>
                ) : (
                  <p>Calculating financial impact...</p>
                )}
              </div>
            </div>

            <div className="stage-questions-box">
              <div className="questions-box-title">
                <HelpCircle size={18} color="var(--color-primary)" />
                <h4>Questions to Ask Before Major Procedure</h4>
              </div>
              <ul className="questions-list">
                <li>
                  <strong>"Has the TPA enhancement request been sent reflecting full procedure estimates?"</strong>
                  <p>Hospital billing desk must submit interim enhancements so final approval matches the anticipated bill.</p>
                </li>
                <li>
                  <strong>"Are surgical implants (if any) billed at capped NPPA ceiling rates?"</strong>
                  <p>Government price caps apply to orthopedics, stents, and surgical meshes.</p>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STAGE 5: RECOVERY / DISCHARGE */}
        {currentStage === 'RECOVERY' && (
          <div className="stage-content-section">
            <div className="stage-header">
              <h3>Stage 5: Recovery, Discharge & Final Financial Reconciliation</h3>
              <p className="stage-sub">
                Final TPA settlement audit, non-payable deductions, and post-hospitalization reimbursement.
              </p>
            </div>

            <div className="stage-cards-grid">
              {/* Financial Reconciliation Card */}
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <CheckCircle2 size={20} color="var(--color-primary)" />
                  <h4>Indicative Financial Reconciliation</h4>
                </div>

                {breakdown ? (
                  <div className="reconciliation-table">
                    <div className="recon-row">
                      <span>Total Estimated Bill</span>
                      <strong>{formatINR(breakdown.itemizedBill.totalBill)}</strong>
                    </div>
                    <div className="recon-row text-primary">
                      <span>Estimated Insurer Share (Cashless Coverage)</span>
                      <strong>- {formatINR(breakdown.totalInsuranceCovered)}</strong>
                    </div>
                    <div className="recon-row text-danger">
                      <span>Estimated Patient Out-of-Pocket Share</span>
                      <strong>= {formatINR(breakdown.totalPatientPayable)}</strong>
                    </div>

                    <div className="recon-breakdown-sub" style={{ marginTop: '12px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px' }}>
                      <div className="sub-detail">
                        <span>• Co-pay ({policy.copay ?? 0}%):</span>
                        <span>{formatINR(breakdown.copayAmount)}</span>
                      </div>
                      <div className="sub-detail">
                        <span>• Room Rent Excess:</span>
                        <span>{formatINR(breakdown.totalRoomRentExcess)}</span>
                      </div>
                      <div className="sub-detail">
                        <span>• Proportionate Deduction:</span>
                        <span>{formatINR(breakdown.proportionateDisallowance)}</span>
                      </div>
                      <div className="sub-detail">
                        <span>• Non-Medical Deductibles / Consumables:</span>
                        <span>{formatINR(breakdown.nonMedicalDeductible)}</span>
                      </div>
                    </div>

                    <div className="recon-status-badge">
                      <CheckCircle2 size={14} />
                      <span>Modeled Calculation Reconciles: Insurer Share + Patient Share = Total Estimated Bill</span>
                    </div>
                  </div>
                ) : (
                  <p>Calculating reconciliation...</p>
                )}
              </div>

              {/* Post-Hospitalization Coverage */}
              <div className="stage-info-card">
                <div className="stage-card-title">
                  <Calendar size={20} color="var(--color-primary)" />
                  <h4>Post-Hospitalization Benefits</h4>
                </div>
                <div className="info-kv-list">
                  <div className="info-kv-row">
                    <span>Post-Hospitalization Window:</span>
                    <strong>{policy.postHospitalizationDays || 60} Days Covered</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Covered Post-Discharge Items:</span>
                    <strong>Follow-up consultations, discharge pharmacy, physiotherapy related to ailment</strong>
                  </div>
                  <div className="info-kv-row">
                    <span>Claim Submission Deadline:</span>
                    <strong>Within 30 days of completing the 60-day window</strong>
                  </div>
                </div>

                <div className="checklist-group" style={{ marginTop: '16px' }}>
                  <div className="checklist-header">Discharge Day Documents Checklist:</div>
                  <label className="checklist-item" onClick={() => toggleCheck('rec_1')}>
                    {completedItems['rec_1'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Collect signed Discharge Summary and Final Itemized Bill with receipt.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('rec_2')}>
                    {completedItems['rec_2'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Obtain copy of TPA Final Approval & Settlement letter showing exact deductions.</span>
                  </label>
                  <label className="checklist-item" onClick={() => toggleCheck('rec_3')}>
                    {completedItems['rec_3'] ? <CheckSquare size={18} color="var(--color-primary)" /> : <Square size={18} />}
                    <span>Collect refund of initial admission deposit after adjusting non-payables.</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Questions to Ask at Discharge */}
            <div className="stage-questions-box">
              <div className="questions-box-title">
                <HelpCircle size={18} color="var(--color-primary)" />
                <h4>Critical Questions to Ask Billing Desk at Discharge</h4>
              </div>
              <ul className="questions-list">
                <li>
                  <strong>"Which specific line items are marked as non-payable consumables by the TPA?"</strong>
                  <p>Ask for the itemized disallowance sheet. Often items like administration charges or syringe fees can be clarified.</p>
                </li>
                <li>
                  <strong>"Has any proportionate deduction been applied to the doctor fees or surgery charges?"</strong>
                  <p>Verify whether room limit capping was triggered and ensure the percentage applied matches policy formulas.</p>
                </li>
                <li>
                  <strong>"Are follow-up medications and wound dressings billed separately for post-hospitalization reimbursement?"</strong>
                  <p>Retain stamped pharmacy invoices for the 60-day post-hospitalization reimbursement claim.</p>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Decision Support Disclaimer */}
      <footer className="journey-disclaimer-footer">
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Non-Binding Decision-Support Platform:</strong> SehatSure provides policy-informed financial estimates and informational navigational guidance based on available reference datasets and uploaded policy parameters. It does NOT provide clinical diagnoses, treatment recommendations, clinical triage, or guarantee insurer claim approval or final hospital billing. Always confirm cashless authorization and tariffs directly with your insurer/TPA and treating facility.
        </div>
      </footer>
    </div>
  );
};
