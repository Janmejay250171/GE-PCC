import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Bed,
  Activity,
  Layers,
  Percent
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { RoomCategory, PolicyImpactBreakdown } from '../types/hospital';
import { fetchHospitalBreakdown } from '../services/hospitalApi';
import { BillBreakdownModal } from '../components/BillBreakdownModal';

interface FinancialImpactPageProps {
  policy: PolicyDocument;
  onNavigateToHospitals: () => void;
  onNavigateToRoomComparison: () => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const FinancialImpactPage: React.FC<FinancialImpactPageProps> = ({
  policy,
  onNavigateToHospitals,
  onNavigateToRoomComparison
}) => {
  const [procedure, setProcedure] = useState<string>('Neurology - Brain & Spine Care');
  const [expectedBill, setExpectedBill] = useState<number>(400000);
  const [roomType, setRoomType] = useState<RoomCategory>('Single Private Room');
  const [city, setCity] = useState<string>('Bengaluru');

  const [breakdown, setBreakdown] = useState<PolicyImpactBreakdown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    calculateImpact();
  }, [roomType, city]);

  const calculateImpact = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use verified backend estimation endpoint
      const data = await fetchHospitalBreakdown({
        policyId: policy._id,
        policy,
        hospitalName: 'Manipal Hospital Bangalore',
        hospitalAddress: '98, Rusthom Bhag, Airport Road, Opposite Leela Palace Road, Bengaluru, Karnataka, 560017',
        city,
        specialty: 'Neurology',
        procedure: procedure.includes('Neurology') ? undefined : procedure,
        roomType,
        expectedBill: expectedBill > 0 ? expectedBill : undefined
      });
      setBreakdown(data);
    } catch (err: any) {
      console.error('Impact calculation error:', err);
      setError(err.message || 'Failed to simulate financial impact.');
    } finally {
      setLoading(false);
    }
  };

  // Derive display values strictly from verified backend breakdown
  const totalBilled = breakdown?.itemizedBill?.totalBill ?? expectedBill;
  const insurerShare = breakdown?.totalInsuranceCovered ?? 0;
  const patientShare = breakdown?.totalPatientPayable ?? totalBilled;

  const insurerPct = totalBilled > 0 ? Math.round((insurerShare / totalBilled) * 100) : 0;
  const patientPct = totalBilled > 0 ? 100 - insurerPct : 100;

  const roomDailyLimit = policy.roomLimit?.type === 'amount'
    ? (Number(policy.roomLimit.value) || 5000)
    : ((Number(policy.roomLimit?.value) || 1) / 100) * (policy.sumInsured || 500000);

  return (
    <div className="financial-simulator-view">
      <div className="simulator-grid-3col">
        {/* COL 1: Input Details */}
        <section className="sim-card sim-inputs-col">
          <div className="sim-card-header">
            <h3>Input Details</h3>
            <span className="sim-card-hint">Customize treatment scenario</span>
          </div>

          {error && (
            <div className="sim-callout-box" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B', marginBottom: 12 }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="sim-form-group">
            <label className="sim-label" htmlFor="sim-proc">
              Procedure / Condition
            </label>
            <select
              id="sim-proc"
              className="sim-select"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
            >
              <option value="Neurology - Brain & Spine Care">Neurology - Inpatient Care</option>
              <option value="Cardiology - Angioplasty">Cardiology - Angioplasty</option>
              <option value="Orthopedics - Joint Replacement">Orthopedics - Joint Replacement</option>
              <option value="General Surgery - Laparoscopic">General Surgery - Laparoscopic</option>
            </select>
          </div>

          <div className="sim-form-group">
            <label className="sim-label" htmlFor="sim-bill">
              Expected Bill Amount (Indicative)
            </label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">₹</span>
              <input
                id="sim-bill"
                type="number"
                className="sim-input with-prefix"
                value={expectedBill}
                onChange={(e) => setExpectedBill(Math.max(10000, Number(e.target.value) || 0))}
                step={25000}
              />
            </div>
          </div>

          <div className="sim-form-group">
            <label className="sim-label" htmlFor="sim-room">
              Room Type
            </label>
            <select
              id="sim-room"
              className="sim-select"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoomCategory)}
            >
              <option value="General Ward">Standard Ward (Budget ~₹2,500/day)</option>
              <option value="Twin Sharing">Semi-Private / Twin (At Cap ~₹5,000/day)</option>
              <option value="Single Private Room">Deluxe / Private (~₹8,000–₹12,000/day)</option>
            </select>
          </div>

          <div className="sim-form-group">
            <label className="sim-label" htmlFor="sim-city">
              City
            </label>
            <select
              id="sim-city"
              className="sim-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary sim-btn-calc"
            onClick={calculateImpact}
            disabled={loading}
          >
            {loading ? 'Calculating...' : 'Calculate Financial Impact'}
          </button>
        </section>

        {/* COL 2: Estimated Financial Breakdown */}
        <section className="sim-card sim-breakdown-col">
          <div className="sim-card-header">
            <h3>Estimated Financial Breakdown</h3>
            <span className="sim-card-hint">Policy-sensitive model outcome</span>
          </div>

          <div className="total-bill-display">
            <span className="total-bill-sub">Total Billed Amount (Estimated)</span>
            <div className="total-bill-val">{formatINR(totalBilled)}</div>
          </div>

          {/* Stacked Dual-Color Proportional Progress Bar */}
          <div className="dual-progress-container">
            <div
              className="progress-slice slice-insurer"
              style={{ width: `${insurerPct}%` }}
              title={`Insurer Share: ${insurerPct}%`}
            />
            <div
              className="progress-slice slice-patient"
              style={{ width: `${patientPct}%` }}
              title={`Patient Share: ${patientPct}%`}
            />
          </div>

          {/* Legend Row */}
          <div className="dual-legend-row">
            <div className="legend-item insurer">
              <span className="legend-dot dot-insurer" />
              <div className="legend-meta">
                <span className="legend-val">{formatINR(insurerShare)}</span>
                <span className="legend-label">Insurer Share ({insurerPct}%)</span>
              </div>
            </div>

            <div className="legend-item patient">
              <span className="legend-dot dot-patient" />
              <div className="legend-meta">
                <span className="legend-val">{formatINR(patientShare)}</span>
                <span className="legend-label">Patient Share ({patientPct}%)</span>
              </div>
            </div>
          </div>

          {/* Contextual Warning / Insight */}
          {breakdown?.proportionateDeductionActive ? (
            <div className="sim-callout-warning">
              <AlertTriangle size={18} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Proportionate deduction active:</strong> Selected room tariff exceeds the policy limit of ₹{roomDailyLimit.toLocaleString('en-IN')}/day. Associated doctor, nursing, and OT charges are reduced proportionally.
              </div>
            </div>
          ) : (
            <div className="sim-callout-success">
              <CheckCircle2 size={18} className="text-success" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Room within policy limit:</strong> No proportionate reduction applies to associated treatment charges.
              </div>
            </div>
          )}

          {/* Deterministic Calculation Trace */}
          {breakdown?.explanationSteps && breakdown.explanationSteps.length > 0 && (
            <div style={{ marginTop: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                Why this estimated patient exposure?
              </div>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: '1.55' }}>
                {breakdown.explanationSteps.slice(1, 5).map((step, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="sim-actions-row">
            <button
              type="button"
              className="btn-link text-primary font-semibold"
              onClick={() => setIsModalOpen(true)}
            >
              <span>View detailed calculation →</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onNavigateToRoomComparison}
            >
              <span>Compare Cheaper Rooms</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* COL 3: Key Policy Constraints Applied */}
        <section className="sim-card sim-constraints-col">
          <div className="sim-card-header">
            <h3>Key Policy Constraints Applied</h3>
            <span className="sim-card-hint">From active policy terms</span>
          </div>

          <div className="constraints-list">
            {/* Constraint 1: Room Rent Limit */}
            <div className="constraint-row">
              <div className="constraint-icon-wrap">
                <Bed size={16} className="text-primary" />
              </div>
              <div className="constraint-content">
                <span className="constraint-title">Room-rent limit</span>
                <span className="constraint-desc">
                  ₹{roomDailyLimit.toLocaleString('en-IN')}/day {policy.roomLimit?.type === 'percent' ? `(${policy.roomLimit.value}% of SI)` : '(Fixed cap)'}
                </span>
              </div>
            </div>

            {/* Constraint 2: Disease Sub-Limit */}
            <div className="constraint-row">
              <div className="constraint-icon-wrap">
                <Layers size={16} className="text-primary" />
              </div>
              <div className="constraint-content">
                <span className="constraint-title">Disease-specific sub-limit</span>
                <span className="constraint-desc">
                  {policy.subLimits && Object.keys(policy.subLimits).length > 0
                    ? 'Specific sub-limits apply'
                    : 'Not specified in uploaded policy'}
                </span>
              </div>
            </div>

            {/* Constraint 3: Co-pay */}
            <div className="constraint-row">
              <div className="constraint-icon-wrap">
                <Percent size={16} className="text-primary" />
              </div>
              <div className="constraint-content">
                <span className="constraint-title">Co-pay</span>
                <span className="constraint-desc">
                  {policy.copay ?? 0}% (Network hospitals only)
                </span>
              </div>
            </div>

            {/* Constraint 4: Deductible */}
            <div className="constraint-row">
              <div className="constraint-icon-wrap">
                <DollarSign size={16} className="text-primary" />
              </div>
              <div className="constraint-content">
                <span className="constraint-title">Deductible</span>
                <span className="constraint-desc">
                  {policy.deductible ? formatINR(policy.deductible) : '₹0'}
                </span>
              </div>
            </div>

            {/* Constraint 5: Restoration */}
            <div className="constraint-row">
              <div className="constraint-icon-wrap">
                <Activity size={16} className="text-primary" />
              </div>
              <div className="constraint-content">
                <span className="constraint-title">Restoration benefit</span>
                <span className="constraint-desc">
                  {policy.restorationBenefit ? '100% on complete exhaustion' : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="constraints-cta-box">
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Want to see actual hospitals in Bengaluru that match these policy rules?
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onNavigateToHospitals}
              style={{ marginTop: '10px', width: '100%' }}
            >
              <span>Explore Matched Hospitals</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>

      {/* Itemized Modal */}
      {isModalOpen && (
        <BillBreakdownModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          hospitalName="Manipal Hospital Bangalore"
          hospitalAddress="98, Rusthom Bhag, Airport Road, Opposite Leela Palace Road, Bengaluru, Karnataka, 560017"
          hospitalCity="Bengaluru"
          hospitalSegment="Premium"
          hospitalTier="Metro 1"
          hospitalRating={4.5}
          initialRoomType={roomType}
          policyId={policy._id}
          policy={policy}
          specialty="Neurology"
          procedure={procedure}
        />
      )}
    </div>
  );
};
