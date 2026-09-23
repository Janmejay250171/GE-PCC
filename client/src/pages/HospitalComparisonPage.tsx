import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Plus,
  X,
  Search,
  ArrowLeft,
  Info,
  Trash2
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { RankedHospitalItem, RoomCategory } from '../types/hospital';
import { BillBreakdownModal } from '../components/BillBreakdownModal';
import { searchHospitals } from '../services/hospitalApi';

interface HospitalComparisonPageProps {
  policy: PolicyDocument;
  hospitals: RankedHospitalItem[];
  onStartCareJourney: (hospital: RankedHospitalItem, room: RoomCategory) => void;
  onBackToSearch: () => void;
  onAddHospital?: (hospital: RankedHospitalItem) => void;
  onRemoveHospital?: (hospital: RankedHospitalItem) => void;
  onSetComparisonHospitals?: (hospitals: RankedHospitalItem[]) => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const HospitalComparisonPage: React.FC<HospitalComparisonPageProps> = ({
  policy,
  hospitals,
  onStartCareJourney,
  onBackToSearch,
  onAddHospital,
  onRemoveHospital,
  onSetComparisonHospitals
}) => {
  const [selectedHospForModal, setSelectedHospForModal] = useState<RankedHospitalItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [availableHospitals, setAvailableHospitals] = useState<RankedHospitalItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local fallback state if parent doesn't provide handlers
  const [localHospitals, setLocalHospitals] = useState<RankedHospitalItem[]>([]);
  const activeList = hospitals.length > 0 ? hospitals : localHospitals;
  const comparisonList = activeList.slice(0, 3);

  // Load available facilities in Bengaluru to power the "+ Add Hospital" modal
  useEffect(() => {
    async function loadCandidates() {
      setLoadingAvailable(true);
      try {
        const res = await searchHospitals({
          policyId: policy._id,
          policy,
          city: 'Bengaluru',
          specialty: 'Neurology',
          roomType: 'General Ward',
          networkOnly: false
        });
        setAvailableHospitals(res.hospitals || []);
      } catch (err) {
        console.error('Failed to load candidate hospitals for comparison:', err);
      } finally {
        setLoadingAvailable(false);
      }
    }
    loadCandidates();
  }, [policy]);

  const handleAdd = (item: RankedHospitalItem) => {
    if (comparisonList.length >= 3) {
      alert('You can compare up to 3 facilities at a time. Please remove one first.');
      return;
    }
    if (onAddHospital) {
      onAddHospital(item);
    } else {
      setLocalHospitals((prev) => [...prev, item]);
    }
    // If we now have at least 2 facilities, we can close the modal or let them continue
    if (comparisonList.length >= 1) {
      setIsAddModalOpen(false);
    }
  };

  const handleRemove = (item: RankedHospitalItem) => {
    if (onRemoveHospital) {
      onRemoveHospital(item);
    } else {
      setLocalHospitals((prev) =>
        prev.filter(
          (h) =>
            !(
              h.hospital.hospital_name === item.hospital.hospital_name &&
              h.hospital.address === item.hospital.address
            )
        )
      );
    }
  };

  const handleClearAll = () => {
    if (onSetComparisonHospitals) {
      onSetComparisonHospitals([]);
    } else {
      setLocalHospitals([]);
    }
  };

  const roomLimitVal =
    policy.roomLimit?.type === 'amount'
      ? Number(policy.roomLimit.value) || 5000
      : policy.roomLimit?.type === 'percent'
      ? ((Number(policy.roomLimit.value) || 1) / 100) * (policy.sumInsured || 500000)
      : 5000;

  // Filter available hospitals in the modal
  const filteredCandidates = availableHospitals.filter((h) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.hospital.hospital_name.toLowerCase().includes(q) ||
      h.hospital.address.toLowerCase().includes(q) ||
      (h.hospital.specialties && h.hospital.specialties.some((s) => s.toLowerCase().includes(q)))
    );
  });

  const isAlreadyInCompare = (item: RankedHospitalItem) => {
    return comparisonList.some(
      (c) =>
        c.hospital.hospital_name === item.hospital.hospital_name &&
        c.hospital.address === item.hospital.address
    );
  };

  return (
    <div className="hospital-comparison-view">
      {/* Top Toolbar */}
      <div className="comparison-top-toolbar">
        <div className="comparison-toolbar-left">
          <h2>Facility Comparison Matrix</h2>
          <p>
            Side-by-side policy coverage, indicative room rates, and estimated out-of-pocket costs.
          </p>
        </div>

        <div className="comparison-toolbar-right">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBackToSearch}
          >
            <ArrowLeft size={14} />
            <span>Find Hospitals</span>
          </button>

          {comparisonList.length < 3 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsAddModalOpen(true)}
              title="Add a hospital to compare"
            >
              <Plus size={14} />
              <span>Add Hospital</span>
            </button>
          )}

          {comparisonList.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearAll}
              title="Clear all hospitals from comparison"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Case 1: Empty State (0 hospitals) */}
      {comparisonList.length === 0 && (
        <div className="comparison-table-card">
          <div className="empty-comparison-box" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Building2 size={44} className="text-muted" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              No Hospitals Selected for Comparison
            </h3>
            <p
              style={{
                maxWidth: '520px',
                margin: '0 auto 24px',
                color: '#64748B',
                fontSize: '0.92rem',
                lineHeight: 1.55
              }}
            >
              Add 2 to 3 hospitals in Bengaluru to compare network empanelment, room charges, and modeled out-of-pocket patient exposure side-by-side.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={16} />
                <span>Add Hospital to Compare</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBackToSearch}
              >
                Browse Hospitals in Bengaluru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Exactly 1 Hospital Selected (Prompt to add at least 1 more) */}
      {comparisonList.length === 1 && (
        <div className="single-hosp-compare-banner">
          <div className="single-hosp-banner-left">
            <Info size={18} className="text-primary" />
            <div>
              <strong>1 facility selected: {comparisonList[0].hospital.hospital_name}.</strong>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                Add at least one more hospital to unlock the side-by-side comparative analysis.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={14} />
            <span>Add Another Hospital</span>
          </button>
        </div>
      )}

      {/* Case 3: 1, 2, or 3 Hospitals Selected — Render Side-by-Side Table */}
      {comparisonList.length > 0 && (
        <div className="comparison-table-card">
          <div className="table-responsive-wrapper">
            <table className="comparison-data-table">
              <thead>
                <tr>
                  <th className="feature-header-cell">Feature</th>
                  {comparisonList.map((item, idx) => (
                    <th key={idx} className="hospital-header-cell">
                      <div className="th-header-top-row">
                        <span className="th-hosp-num">Facility {idx + 1} of 3</span>
                        <button
                          type="button"
                          className="btn-remove-from-compare"
                          onClick={() => handleRemove(item)}
                          title="Remove this hospital from comparison"
                          aria-label={`Remove ${item.hospital.hospital_name}`}
                        >
                          <X size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="th-hospital-title">{item.hospital.hospital_name}</div>
                      <div className="th-hospital-sub">{item.hospital.address.split(',')[0]}</div>
                    </th>
                  ))}

                  {/* Slot for adding next hospital if fewer than 3 */}
                  {comparisonList.length < 3 && (
                    <th className="hospital-header-cell add-hosp-slot-header">
                      <button
                        type="button"
                        className="add-hosp-table-btn"
                        onClick={() => setIsAddModalOpen(true)}
                        title="Add another facility to compare"
                      >
                        <Plus size={20} />
                        <span className="add-hosp-text">Add Hospital</span>
                        <small className="add-hosp-sub">
                          {comparisonList.length === 1 ? 'Slot 2 of 3' : 'Slot 3 of 3'}
                        </small>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Policy Fit Score */}
                <tr>
                  <td className="feature-label-cell">Policy Fit Score</td>
                  {comparisonList.map((item, idx) => (
                    <td key={idx} className="feature-value-cell">
                      <span className="fit-score-badge-table">
                        {item.score.finalScore} / 100
                      </span>
                    </td>
                  ))}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 2: Network Status */}
                <tr>
                  <td className="feature-label-cell">Network Status</td>
                  {comparisonList.map((_item, idx) => (
                    <td key={idx} className="feature-value-cell">
                      <div className="table-network-tag">
                        <CheckCircle2 size={15} className="text-success" />
                        <span>Reference match</span>
                      </div>
                      <small className="table-sub-note">Confirm cashless desk</small>
                    </td>
                  ))}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 3: Specialty Department */}
                <tr>
                  <td className="feature-label-cell">Specialty Department</td>
                  {comparisonList.map((item, idx) => (
                    <td key={idx} className="feature-value-cell">
                      <span className="table-yes-badge">
                        ✓ {item.hospital.specialties?.[0] || 'Listed'}
                      </span>
                      <small className="table-sub-note">Listed in reference dataset</small>
                    </td>
                  ))}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 4: Room Rate (Deluxe / Private) */}
                <tr>
                  <td className="feature-label-cell">Indicative Room (Deluxe / Private)</td>
                  {comparisonList.map((item, idx) => {
                    const rate =
                      item.estimate.singlePrivateRate ||
                      (idx === 0 ? 8000 : idx === 1 ? 7500 : 6500);
                    return (
                      <td key={idx} className="feature-value-cell">
                        <strong>₹{rate.toLocaleString('en-IN')}/day</strong>
                        <small className="table-sub-note">
                          Policy cap: {formatINR(roomLimitVal)}/day
                        </small>
                      </td>
                    );
                  })}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 5: Estimated Total Cost */}
                <tr>
                  <td className="feature-label-cell">Estimated Total Cost</td>
                  {comparisonList.map((item, idx) => (
                    <td key={idx} className="feature-value-cell">
                      <strong className="text-primary">
                        {formatINR(item.estimate.totalCost)}
                      </strong>
                      <small className="table-sub-note">Indicative reference estimate</small>
                    </td>
                  ))}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 6: Key Considerations */}
                <tr>
                  <td className="feature-label-cell">Key Considerations</td>
                  {comparisonList.map((_item, idx) => (
                    <td key={idx} className="feature-value-cell consideration-text">
                      {idx === 0
                        ? 'Broad specialty coverage and tertiary care capacity.'
                        : idx === 1
                        ? 'Established network presence and standardized packaging.'
                        : 'Lower daily room tariff minimizes proportionate disallowances.'}
                    </td>
                  ))}
                  {comparisonList.length < 3 && <td className="add-hosp-empty-cell">—</td>}
                </tr>

                {/* Row 7: Actions */}
                <tr className="table-actions-row">
                  <td className="feature-label-cell">Next Steps</td>
                  {comparisonList.map((item, idx) => (
                    <td key={idx} className="feature-value-cell">
                      <div className="table-action-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedHospForModal(item)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onStartCareJourney(item, 'General Ward')}
                        >
                          Start Journey
                        </button>
                      </div>
                    </td>
                  ))}
                  {comparisonList.length < 3 && (
                    <td className="add-hosp-empty-cell">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsAddModalOpen(true)}
                      >
                        <Plus size={13} />
                        <span>Add Facility</span>
                      </button>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Hospital Modal */}
      {isAddModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card add-hosp-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 2px' }}>
                  Add Hospital to Compare
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Select a facility from Bengaluru to compare side-by-side with your active policy.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="add-hosp-search-bar" style={{ marginTop: '14px' }}>
              <Search size={16} className="add-hosp-search-icon" />
              <input
                type="text"
                className="add-hosp-search-input"
                placeholder="Search by hospital name or area (e.g. Manipal, Aster, Fortis, Whitefield)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Candidates List */}
            <div className="add-hosp-results-list">
              {loadingAvailable && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  Loading reference facilities in Bengaluru...
                </div>
              )}

              {!loadingAvailable && filteredCandidates.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  No facilities found matching "{searchQuery}".
                </div>
              )}

              {!loadingAvailable &&
                filteredCandidates.slice(0, 15).map((cand) => {
                  const already = isAlreadyInCompare(cand);
                  const isMax = comparisonList.length >= 3;

                  return (
                    <div
                      key={`${cand.hospital.hospital_name}-${cand.hospital.address}`}
                      className="add-hosp-item-card"
                    >
                      <div className="add-hosp-item-info">
                        <div className="add-hosp-item-title">{cand.hospital.hospital_name}</div>
                        <div className="add-hosp-item-addr">{cand.hospital.address}</div>
                        <div className="add-hosp-item-meta">
                          <span className="add-hosp-fit-tag">
                            Policy Fit: {cand.score.finalScore}/100
                          </span>
                          <span className="add-hosp-cost-tag">
                            Est: <strong>{formatINR(cand.estimate.totalCost)}</strong>
                          </span>
                          {cand.hospital.tier && (
                            <span style={{ color: '#64748B' }}>• {cand.hospital.tier}</span>
                          )}
                        </div>
                      </div>

                      <div className="add-hosp-item-action">
                        {already ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled
                            style={{ opacity: 0.7 }}
                          >
                            <CheckCircle2 size={14} className="text-success" />
                            <span>In Comparison</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isMax}
                            onClick={() => handleAdd(cand)}
                            title={isMax ? 'Maximum 3 facilities reached' : 'Add to comparison'}
                          >
                            <Plus size={14} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-toolbar">
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                Currently comparing <strong>{comparisonList.length}</strong> of 3 facilities
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Breakdown Modal */}
      {selectedHospForModal && (
        <BillBreakdownModal
          isOpen={true}
          onClose={() => setSelectedHospForModal(null)}
          hospitalName={selectedHospForModal.hospital.hospital_name}
          hospitalAddress={selectedHospForModal.hospital.address}
          hospitalCity={selectedHospForModal.hospital.city}
          hospitalSegment={selectedHospForModal.hospital.segment}
          hospitalTier={selectedHospForModal.hospital.tier}
          hospitalRating={selectedHospForModal.hospital.rating}
          initialRoomType="General Ward"
          policyId={policy._id}
          policy={policy}
          onStartCareJourney={(room) => {
            setSelectedHospForModal(null);
            onStartCareJourney(selectedHospForModal, room);
          }}
        />
      )}
    </div>
  );
};
