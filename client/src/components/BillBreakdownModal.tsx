import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  Bed,
  ShieldAlert,
  ArrowDownCircle,
  Clock
} from 'lucide-react';
import { PolicyImpactBreakdown, RoomCategory } from '../types/hospital';
import { fetchHospitalBreakdown } from '../services/hospitalApi';

interface BillBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity?: string;
  hospitalId?: string;
  hospitalSegment: string;
  hospitalTier: string;
  hospitalRating: number;
  initialRoomType: RoomCategory;
  policyId?: string;
  policy?: any;
  specialty?: string;
  procedure?: string;
  onStartCareJourney?: (room: RoomCategory) => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const BillBreakdownModal: React.FC<BillBreakdownModalProps> = ({
  isOpen,
  onClose,
  hospitalName,
  hospitalAddress,
  hospitalCity,
  hospitalId,
  hospitalSegment,
  hospitalTier,
  hospitalRating,
  initialRoomType,
  policyId,
  policy,
  specialty,
  procedure,
  onStartCareJourney
}) => {
  const [currentRoom, setCurrentRoom] = useState<RoomCategory>(initialRoomType || 'General Ward');
  const [breakdown, setBreakdown] = useState<PolicyImpactBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentRoom(initialRoomType || 'General Ward');
    loadBreakdown(initialRoomType || 'General Ward');
  }, [isOpen, initialRoomType, hospitalName, hospitalCity, specialty, procedure]);

  const loadBreakdown = async (roomType: RoomCategory) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHospitalBreakdown({
        policyId,
        policy,
        hospitalName,
        hospitalAddress,
        city: hospitalCity,
        hospitalId,
        specialty,
        procedure,
        roomType
      });
      setBreakdown(data);
    } catch (err: any) {
      console.error('Failed to load bill breakdown:', err);
      setError(err.message || 'Failed to calculate bill breakdown.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChange = (roomType: RoomCategory) => {
    setCurrentRoom(roomType);
    loadBreakdown(roomType);
  };

  if (!isOpen) return null;

  const b = breakdown;
  const bill = b?.itemizedBill;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card bill-breakdown-card" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Building2 size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{hospitalName}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-segment">{hospitalSegment}</span>
              <span className="badge badge-tier">{hospitalTier}</span>
              {b?.estimateLevelLabel && (
                <span className="badge badge-estimate-level" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                  {b.estimateLevelLabel}
                </span>
              )}
              {hospitalRating > 0 && (
                <span className="rating-badge">★ {hospitalRating.toFixed(1)}</span>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {hospitalAddress}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Policy Snapshot Bar */}
        {b && (
          <div className="policy-quick-strip">
            <div className="strip-item">
              <span className="strip-label">Insurer</span>
              <span className="strip-val">{b.policy.insurer || 'Not Specified'}</span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Sum Insured</span>
              <span className="strip-val">{formatINR(b.policy.sumInsured || 0)}</span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Room Limit</span>
              <span className="strip-val">{b.roomLimitType}</span>
            </div>
            <div className="strip-item">
              <span className="strip-label">Policy Co-pay</span>
              <span className="strip-val">{b.copayPercent}%</span>
            </div>
            {specialty && (
              <div className="strip-item">
                <span className="strip-label">Clinical Dept</span>
                <span className="strip-val">{specialty}</span>
              </div>
            )}
            {procedure && (
              <div className="strip-item">
                <span className="strip-label">Procedure</span>
                <span className="strip-val">{procedure}</span>
              </div>
            )}
          </div>
        )}

        {/* Room Category Switcher */}
        <div className="room-switcher-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bed size={17} color="var(--color-primary)" /> Select Room Category:
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              (Instant recalculation of estimated out-of-pocket share)
            </span>
          </div>
          <div className="room-buttons-grid">
            {(['General Ward', 'Twin Sharing', 'Single Private Room'] as RoomCategory[]).map(cat => (
              <button
                key={cat}
                type="button"
                className={`room-pill-btn ${currentRoom === cat ? 'active' : ''}`}
                onClick={() => handleRoomChange(cat)}
                disabled={loading}
              >
                <span>{cat}</span>
                {bill && currentRoom === cat && (
                  <span className="room-rate-tag">{formatINR(bill.roomRatePerDay)}/day</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Two Columns */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <Clock size={28} className="spin-animation" style={{ marginBottom: '8px' }} />
            <div>Calculating itemized charges and insurance deductions...</div>
          </div>
        )}

        {error && (
          <div className="alert-card alert-danger" style={{ margin: '16px 0' }}>
            <AlertTriangle size={20} />
            <div>{error}</div>
          </div>
        )}

        {!loading && b && bill && (
          <div className="bill-content-grid">
            {/* Left: Itemized Bill */}
            <div className="bill-card itemized-bill-box">
              <h3 className="section-title">
                <span>1. Estimated Treatment Bill (Reference Model)</span>
                <span className="stay-tag">{bill.stayDays} Days Stay</span>
              </h3>

              <div className="bill-table">
                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Room Charges</span>
                    <small>({formatINR(bill.roomRatePerDay)}/day × {bill.stayDays} days from dataset)</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(bill.roomCharges)}</div>
                </div>

                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Procedure Cost</span>
                    <small>(Benchmark from dataset adjusted for hospital segment & tier)</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(bill.procedureCharges)}</div>
                </div>

                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Doctor & Specialist Fees</span>
                    <small>(Modeled allocation: 20% of procedure estimate)</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(bill.doctorFees)}</div>
                </div>

                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Medicines & Lab Tests</span>
                    <small>(Modeled allocation: 10% of procedure estimate)</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(bill.medicineCharges)}</div>
                </div>

                <div className="bill-row bill-total-row">
                  <div className="bill-item-name">
                    <strong>Total Estimated Hospital Bill</strong>
                  </div>
                  <div className="bill-item-amount">
                    <strong>{formatINR(bill.totalBill)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Insurance Deductions & Patient Share */}
            <div className="bill-card insurance-deduction-box">
              <h3 className="section-title">
                <span>2. Estimated Policy Impact & Cost Sharing</span>
              </h3>

              <div className="bill-table">
                {/* Room Rent Excess */}
                <div className={`bill-row ${b.totalRoomRentExcess > 0 ? 'row-excess' : ''}`}>
                  <div className="bill-item-name">
                    <span>Room Rent Excess</span>
                    {b.roomRentExcessPerDay > 0 ? (
                      <small style={{ color: 'var(--color-danger)' }}>
                        Exceeds limit by {formatINR(b.roomRentExcessPerDay)}/day
                      </small>
                    ) : (
                      <small style={{ color: 'var(--color-primary)' }}>
                        Within policy limit ({b.roomLimitType})
                      </small>
                    )}
                  </div>
                  <div className="bill-item-amount" style={{ color: b.totalRoomRentExcess > 0 ? 'var(--color-danger)' : 'inherit' }}>
                    {formatINR(b.totalRoomRentExcess)}
                  </div>
                </div>

                {/* Potential Proportionate Deduction */}
                {b.proportionateDeductionActive && (
                  <div className="bill-row row-excess">
                    <div className="bill-item-name">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldAlert size={14} color="var(--color-danger)" /> Potential Proportionate Deduction
                      </span>
                      <small style={{ color: 'var(--color-danger)' }}>
                        Modeled reduction on associate medical expenses due to room limit breach
                      </small>
                    </div>
                    <div className="bill-item-amount" style={{ color: 'var(--color-danger)' }}>
                      +{formatINR(b.proportionateDisallowance)}
                    </div>
                  </div>
                )}

                {/* Disease-Specific Sublimit Disallowance */}
                {(b.diseaseSublimitDisallowance ?? 0) > 0 && (
                  <div className="bill-row row-excess">
                    <div className="bill-item-name">
                      <span style={{ color: 'var(--color-danger)' }}>
                        Disease Sublimit Disallowance ({b.sublimitMatchedClause || 'Procedure Cap'})
                      </span>
                      <small style={{ color: 'var(--color-danger)' }}>
                        Capped at {formatINR(b.diseaseSublimit ?? 0)} by policy schedule clause
                      </small>
                    </div>
                    <div className="bill-item-amount" style={{ color: 'var(--color-danger)' }}>
                      +{formatINR(b.diseaseSublimitDisallowance ?? 0)}
                    </div>
                  </div>
                )}

                {/* Compulsory Policy Deductible */}
                {b.deductibleApplied > 0 && (
                  <div className="bill-row row-excess">
                    <div className="bill-item-name">
                      <span style={{ color: 'var(--color-warning)' }}>Compulsory Policy Deductible</span>
                      <small style={{ color: 'var(--color-text-muted)' }}>
                        Policy deductible of {formatINR(b.policyDeductible)} applied before co-pay
                      </small>
                    </div>
                    <div className="bill-item-amount" style={{ color: 'var(--color-warning)' }}>
                      +{formatINR(b.deductibleApplied)}
                    </div>
                  </div>
                )}

                {/* Co-pay Amount */}
                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Estimated Co-payment ({b.copayPercent}%)</span>
                    <small>Patient share on admissible claim after deductible</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(b.copayAmount)}</div>
                </div>

                {/* Excess over Sum Insured */}
                {b.excessOverSumInsured > 0 && (
                  <div className="bill-row row-excess">
                    <div className="bill-item-name">
                      <span style={{ color: 'var(--color-danger)' }}>Estimated Excess over Sum Insured</span>
                      <small style={{ color: 'var(--color-danger)' }}>
                        Modeled claim exceeds ₹{b.policy.sumInsured?.toLocaleString('en-IN')} available sum insured
                      </small>
                    </div>
                    <div className="bill-item-amount" style={{ color: 'var(--color-danger)' }}>
                      +{formatINR(b.excessOverSumInsured)}
                    </div>
                  </div>
                )}

                {/* Non-medical consumables */}
                <div className="bill-row">
                  <div className="bill-item-name">
                    <span>Estimated Non-Medical Consumables (~5%)</span>
                    <small>Modeled prototype assumption for excluded items (gloves, PPE, admin kits)</small>
                  </div>
                  <div className="bill-item-amount">{formatINR(b.nonMedicalDeductible)}</div>
                </div>

                {/* Summary Split */}
                <div className="final-split-box">
                  <div className="split-col insurance-split">
                    <span className="split-label">Estimated Insurer Share</span>
                    <span className="split-value">{formatINR(b.estimatedInsurerShare ?? b.totalInsuranceCovered)}</span>
                  </div>
                  <div className="split-col patient-split">
                    <span className="split-label">Estimated Patient Share</span>
                    <span className="split-value highlight">{formatINR(b.estimatedPatientShare ?? b.totalPatientPayable)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                  Reconciled: Insurer Share + Patient Share = Total Estimated Bill
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Policy Guidance & Financial Notes */}
        {!loading && b && b.aiRecommendations && b.aiRecommendations.length > 0 && (
          <div className="ai-advisor-section">
            <div className="ai-advisor-header">
              <ShieldCheck size={18} color="var(--color-primary)" />
              <strong>Policy & Financial Guidance Notes</strong>
            </div>

            <div className="ai-recommendations-list">
              {b.aiRecommendations.map((rec, idx) => (
                <div key={idx} className={`ai-rec-card rec-${rec.type}`}>
                  <div className="rec-title-row">
                    {rec.type === 'warning' && <AlertTriangle size={17} />}
                    {rec.type === 'success' && <CheckCircle2 size={17} />}
                    {rec.type === 'info' && <Info size={17} />}
                    <strong>{rec.title}</strong>
                  </div>
                  <p className="rec-message">{rec.message}</p>
                  {rec.actionable && (
                    <div className="rec-actionable">
                      <ArrowDownCircle size={15} />
                      <span>{rec.actionable}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traceable Calculation Audit Trail */}
        {!loading && b && b.explanationSteps && b.explanationSteps.length > 0 && (
          <div className="bill-card" style={{ margin: '16px 24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Clock size={16} color="var(--color-primary)" />
              <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Deterministic Calculation Audit Trail</strong>
              <span style={{ fontSize: '0.75rem', background: '#E2E8F0', padding: '2px 8px', borderRadius: '12px', color: '#475569' }}>
                Zero Guesswork
              </span>
            </div>
            <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: '1.65' }}>
              {b.explanationSteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', flex: 1, minWidth: '240px' }}>
            *Indicative estimate based on static prototype reference cost data (date not specified by source) and selected policy terms. Not a hospital quotation. Actual hospital charges, insurer authorization, and final claim settlement may differ.
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onStartCareJourney && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onStartCareJourney(currentRoom);
                }}
              >
                Navigate Care Journey
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
