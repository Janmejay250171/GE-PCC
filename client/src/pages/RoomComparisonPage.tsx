import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Info,
  ShieldCheck,
  Building2,
  HelpCircle
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { RankedHospitalItem, RoomCategory, PolicyImpactBreakdown } from '../types/hospital';
import { fetchHospitalBreakdown, searchHospitals } from '../services/hospitalApi';

interface RoomComparisonPageProps {
  policy: PolicyDocument;
  selectedHospital?: RankedHospitalItem | null;
  onNavigateToJourney?: (hospital: RankedHospitalItem, room: RoomCategory) => void;
  onNavigateToXRay?: () => void;
}

interface RoomTier {
  id: string;
  name: string;
  category: RoomCategory;
  ratePerDay: number;
  isRecommended?: boolean;
  description: string;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const RoomComparisonPage: React.FC<RoomComparisonPageProps> = ({
  policy,
  selectedHospital,
  onNavigateToJourney,
  onNavigateToXRay
}) => {
  const [activeHospital, setActiveHospital] = useState<RankedHospitalItem | null>(selectedHospital || null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('deluxe');
  const [loading, setLoading] = useState<boolean>(true);
  const [breakdownSelected, setBreakdownSelected] = useState<PolicyImpactBreakdown | null>(null);
  const [breakdownBaseline, setBreakdownBaseline] = useState<PolicyImpactBreakdown | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Policy Room Limit derived from policy
  const roomLimit =
    policy.roomLimit?.type === 'amount'
      ? Number(policy.roomLimit.value) || 5000
      : policy.roomLimit?.type === 'percent'
      ? ((Number(policy.roomLimit.value) || 1) / 100) * (policy.sumInsured || 500000)
      : 5000;

  // Room Tiers configuration
  const roomTiers: RoomTier[] = [
    {
      id: 'standard',
      name: 'Standard Room',
      category: 'General Ward',
      ratePerDay: 3200,
      isRecommended: true,
      description: 'Within policy limit of ₹' + roomLimit.toLocaleString('en-IN') + '/day. No proportionate deductions.'
    },
    {
      id: 'semi-private',
      name: 'Semi-Private Room',
      category: 'Twin Sharing',
      ratePerDay: 5000,
      isRecommended: false,
      description: 'Matches exact policy cap limit. Zero out-of-pocket room rent penalty.'
    },
    {
      id: 'deluxe',
      name: 'Deluxe Room',
      category: 'Single Private Room',
      ratePerDay: 8000,
      isRecommended: false,
      description: 'Exceeds limit by ₹3,000/day. Triggers proportionate deduction across associated hospital charges.'
    },
    {
      id: 'suite',
      name: 'Suite Room',
      category: 'Single Private Room',
      ratePerDay: 12000,
      isRecommended: false,
      description: 'Significant room excess. Patient absorbs extensive proportionate disallowance.'
    }
  ];

  // If no hospital provided, fetch default Bengaluru neurology hospitals
  useEffect(() => {
    async function initHospitals() {
      if (!activeHospital) {
        try {
          const res = await searchHospitals({
            policyId: policy._id,
            policy,
            city: 'Bengaluru',
            specialty: 'Neurology',
            roomType: 'Single Private Room',
            networkOnly: false
          });
          if (res.hospitals.length > 0) {
            setActiveHospital(res.hospitals[0]);
          }
        } catch (e) {
          console.error('Failed to load initial hospital for room comparison:', e);
        }
      }
    }
    initHospitals();
  }, [policy]);

  // Recalculate breakdowns whenever selected room or hospital changes
  useEffect(() => {
    async function calculateBreakdowns() {
      if (!activeHospital) return;
      setLoading(true);
      try {
        const currentTier = roomTiers.find((r) => r.id === selectedRoomId) || roomTiers[2];
        const baselineTier = roomTiers[0]; // Standard room

        const [resSelected, resBaseline] = await Promise.all([
          fetchHospitalBreakdown({
            policyId: policy._id,
            policy,
            hospitalName: activeHospital.hospital.hospital_name,
            hospitalAddress: activeHospital.hospital.address,
            city: 'Bengaluru',
            specialty: 'Neurology',
            procedure: 'Neurology - Brain Tumor Surgery',
            roomType: currentTier.category
          }),
          fetchHospitalBreakdown({
            policyId: policy._id,
            policy,
            hospitalName: activeHospital.hospital.hospital_name,
            hospitalAddress: activeHospital.hospital.address,
            city: 'Bengaluru',
            specialty: 'Neurology',
            procedure: 'Neurology - Brain Tumor Surgery',
            roomType: baselineTier.category
          })
        ]);

        setBreakdownSelected(resSelected);
        setBreakdownBaseline(resBaseline);
      } catch (err) {
        console.error('Failed to fetch room comparison breakdowns:', err);
      } finally {
        setLoading(false);
      }
    }

    calculateBreakdowns();
  }, [selectedRoomId, activeHospital, policy]);

  const currentTier = roomTiers.find((r) => r.id === selectedRoomId) || roomTiers[2];
  const baselineTier = roomTiers[0];

  // Numbers dynamically derived from verified backend breakdowns
  const totalBilledSelected = breakdownSelected?.itemizedBill?.totalBill ?? 0;
  const totalBilledBaseline = breakdownBaseline?.itemizedBill?.totalBill ?? 0;
  const billDiff = totalBilledBaseline - totalBilledSelected;

  const insurerShareSelected = breakdownSelected?.totalInsuranceCovered ?? 0;
  const insurerShareBaseline = breakdownBaseline?.totalInsuranceCovered ?? 0;
  const insurerDiff = insurerShareBaseline - insurerShareSelected;

  const patientShareSelected = breakdownSelected?.totalPatientPayable ?? 0;
  const patientShareBaseline = breakdownBaseline?.totalPatientPayable ?? 0;
  const patientDiff = patientShareBaseline - patientShareSelected;
  const savings = Math.max(0, patientShareSelected - patientShareBaseline);

  return (
    <div className="room-choice-view">
      {/* Context banner for hospital & procedure */}
      {activeHospital && (
        <div className="room-context-strip">
          <div className="context-item">
            <Building2 size={16} className="text-primary" />
            <span className="context-label">Hospital:</span>
            <strong>{activeHospital.hospital.hospital_name}</strong>
          </div>
          <div className="context-item">
            <span className="context-label">Procedure:</span>
            <span>Brain Tumor Surgery (Neurology)</span>
          </div>
          <div className="context-item">
            <span className="context-label">Policy Limit:</span>
            <span className="badge badge-subtle">{formatINR(roomLimit)} / day</span>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Room Selector, Right = Comparison Table */}
      <div className="room-choice-grid">
        {/* Left Column: Select Room Type */}
        <section className="room-selection-card">
          <div className="card-header-clean">
            <h2 className="section-title">Select Room Type</h2>
            <p className="section-subtitle">Choose a room category to preview insurance disallowances</p>
          </div>

          <div className="room-options-list" role="radiogroup" aria-label="Room Category Options">
            {roomTiers.map((tier) => {
              const isSelected = tier.id === selectedRoomId;
              const isOverCap = tier.ratePerDay > roomLimit;

              return (
                <label
                  key={tier.id}
                  className={`room-radio-item ${isSelected ? 'selected' : ''} ${isOverCap ? 'over-cap' : ''}`}
                >
                  <div className="radio-control-col">
                    <input
                      type="radio"
                      name="roomTypeSelection"
                      value={tier.id}
                      checked={isSelected}
                      onChange={() => setSelectedRoomId(tier.id)}
                      className="room-native-radio"
                    />
                  </div>

                  <div className="room-info-col">
                    <div className="room-title-row">
                      <span className="room-name">{tier.name}</span>
                      {tier.isRecommended && (
                        <span className="recommended-tag">Recommended</span>
                      )}
                    </div>
                    <div className="room-rate-tag">
                      <strong>{formatINR(tier.ratePerDay)}</strong>
                      <span className="per-day">/ day</span>
                    </div>
                    <p className="room-subtext">{tier.description}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="room-notice-box">
            <Info size={15} className="text-primary" />
            <span>
              Room rent limit: <strong>{formatINR(roomLimit)}/day</strong>. If you choose a room above this limit, proportionate deduction applies to nursing, doctor fees, and ICU.
            </span>
          </div>
        </section>

        {/* Right Column: Financial Impact Comparison */}
        <section className="room-impact-card">
          <div className="card-header-clean">
            <div className="impact-header-row">
              <h2 className="section-title">Financial Impact Comparison</h2>
              <button
                type="button"
                className="btn-link-action"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                <HelpCircle size={14} />
                <span>Why does room choice matter?</span>
              </button>
            </div>
            <p className="section-subtitle">
              Comparing <strong>{currentTier.name}</strong> ({formatINR(currentTier.ratePerDay)}/day) with recommended <strong>Standard Room</strong> ({formatINR(baselineTier.ratePerDay)}/day)
            </p>
          </div>

          {loading ? (
            <div className="room-loading-state">
              <div className="mini-spinner" />
              <span>Calculating policy adjudication and proportionate deductions...</span>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="room-comparison-table">
                <thead>
                  <tr>
                    <th className="th-metric">Metric</th>
                    <th className="th-active">
                      {currentTier.name}
                      <span className="th-subrate">({formatINR(currentTier.ratePerDay)}/day)</span>
                    </th>
                    <th className="th-baseline">
                      Standard Room
                      <span className="th-subrate">({formatINR(baselineTier.ratePerDay)}/day)</span>
                    </th>
                    <th className="th-diff">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="td-label">Estimated Total Bill</td>
                    <td className="td-val font-mono">{formatINR(totalBilledSelected)}</td>
                    <td className="td-val font-mono">{formatINR(totalBilledBaseline)}</td>
                    <td className={`td-diff font-mono ${billDiff <= 0 ? 'text-success' : 'text-danger'}`}>
                      {billDiff <= 0 ? `- ${formatINR(Math.abs(billDiff))}` : `+ ${formatINR(billDiff)}`}
                    </td>
                  </tr>

                  <tr>
                    <td className="td-label">Insurer Share</td>
                    <td className="td-val font-mono text-primary font-bold">{formatINR(insurerShareSelected)}</td>
                    <td className="td-val font-mono text-primary font-bold">{formatINR(insurerShareBaseline)}</td>
                    <td className={`td-diff font-mono ${insurerDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                      {insurerDiff >= 0 ? `+ ${formatINR(insurerDiff)}` : `- ${formatINR(Math.abs(insurerDiff))}`}
                    </td>
                  </tr>

                  <tr className="highlight-row">
                    <td className="td-label">
                      <strong>Patient Out-of-Pocket Share</strong>
                    </td>
                    <td className="td-val font-mono text-danger font-bold">{formatINR(patientShareSelected)}</td>
                    <td className="td-val font-mono text-success font-bold">{formatINR(patientShareBaseline)}</td>
                    <td className="td-diff font-mono text-success font-bold">
                      {patientDiff <= 0 ? `- ${formatINR(Math.abs(patientDiff))}` : `+ ${formatINR(patientDiff)}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Modeled Out-of-Pocket Exposure Comparison Banner */}
              {savings > 0 && selectedRoomId !== 'standard' ? (
                <div className="room-savings-banner">
                  <CheckCircle2 size={20} className="savings-icon" />
                  <div className="savings-text">
                    Estimated reduction in modeled patient out-of-pocket exposure of approximately <strong>{formatINR(savings)}</strong> by selecting a <strong>Standard Room</strong>, based on modeled policy constraints.
                  </div>
                </div>
              ) : selectedRoomId === 'standard' ? (
                <div className="room-savings-banner optimal">
                  <CheckCircle2 size={20} className="savings-icon" />
                  <div className="savings-text">
                    <strong>Within Policy Limit:</strong> Standard Room rate is within your policy limit of {formatINR(roomLimit)}/day. No proportionate disallowance modeled on associated medical charges.
                  </div>
                </div>
              ) : null}

              {/* Progressive Disclosure Explanation Drawer */}
              {showExplanation && (
                <div className="proportionate-drawer">
                  <div className="drawer-header">
                    <ShieldCheck size={16} className="text-primary" />
                    <strong>How Proportionate Deduction Works</strong>
                  </div>
                  <p>
                    Most Indian health insurance policies have a Room Rent limit (e.g. 1% of Sum Insured = ₹5,000/day).
                    When you select a room with a higher tariff (e.g., Deluxe at ₹8,000/day):
                  </p>
                  <ul>
                    <li>
                      <strong>Proportionate Ratio:</strong> Eligible Cap (₹5,000) ÷ Actual Rate (₹8,000) = <strong>62.5%</strong>
                    </li>
                    <li>
                      The insurer applies this 62.5% ratio not just to room charges, but also to doctor visits, surgery fees, and OT charges.
                    </li>
                    <li>
                      The remaining <strong>37.5%</strong> becomes an unexpected out-of-pocket deduction for the patient.
                    </li>
                  </ul>
                  <small className="source-citation">
                    Room Rent Terms — {policy.planName || policy.insurer || 'Policy Schedule'}
                  </small>
                </div>
              )}

              {/* Next Steps CTA */}
              <div className="room-actions-bar">
                {activeHospital && onNavigateToJourney && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onNavigateToJourney(activeHospital, currentTier.category)}
                  >
                    <span>Proceed to Care Journey with {currentTier.name}</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                {onNavigateToXRay && (
                  <button type="button" className="btn btn-secondary" onClick={onNavigateToXRay}>
                    Review Policy Terms
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Brand Strip matching Reference Image */}
      <footer className="room-brand-quote-strip">
        <span className="quote-text">“Informed healthcare decisions for a more secure tomorrow.”</span>
        <div className="quote-separator" />
        <div className="brand-sig">
          <ShieldCheck size={15} className="text-primary" />
          <strong>SehatSure</strong>
          <span className="sig-divider">|</span>
          <span>People</span>
          <span className="sig-divider">|</span>
          <span>Policies</span>
          <span className="sig-divider">|</span>
          <span>Peace of Mind</span>
        </div>
      </footer>
    </div>
  );
};
