import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Stethoscope,
  Activity,
  Bed,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import {
  RankedHospitalItem,
  RoomCategory
} from '../types/hospital';
import {
  fetchCities,
  fetchTaxonomy,
  searchHospitals
} from '../services/hospitalApi';
import { BillBreakdownModal } from '../components/BillBreakdownModal';

interface HospitalDiscoveryPageProps {
  policy: PolicyDocument;
  onBackToPolicy: () => void;
  onResetPolicy: () => void;
  onStartCareJourney?: (hospital: RankedHospitalItem, room: RoomCategory, procedure?: string) => void;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export const HospitalDiscoveryPage: React.FC<HospitalDiscoveryPageProps> = ({
  policy,
  onBackToPolicy,
  onResetPolicy,
  onStartCareJourney
}) => {
  // Filter state
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<RoomCategory>('General Ward');
  const [networkOnly, setNetworkOnly] = useState<boolean>(false);

  // Data state
  const [cities, setCities] = useState<{ name: string; count: number }[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [proceduresMap, setProceduresMap] = useState<Record<string, string[]>>({});
  const [availableProcedures, setAvailableProcedures] = useState<string[]>([]);

  // Results state
  const [hospitals, setHospitals] = useState<RankedHospitalItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalCityHospitals, setTotalCityHospitals] = useState<number>(0);
  const [networkFacilityCount, setNetworkFacilityCount] = useState<number>(0);
  const [specialtyMatchedCount, setSpecialtyMatchedCount] = useState<number>(0);
  const [procedureMatchedCount, setProcedureMatchedCount] = useState<number>(0);
  const [cityAverageCost, setCityAverageCost] = useState<number>(0);
  const [isFallbackNetwork, setIsFallbackNetwork] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [displayCount, setDisplayCount] = useState<number>(12);

  // Modal state
  const [selectedHospitalForModal, setSelectedHospitalForModal] = useState<RankedHospitalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load initial cities & taxonomy
  useEffect(() => {
    async function loadMeta() {
      try {
        const [citiesData, taxData] = await Promise.all([
          fetchCities(),
          fetchTaxonomy()
        ]);
        setCities(citiesData);
        setSpecialties(taxData.specialties || []);
        setProceduresMap(taxData.proceduresBySpecialty || {});

        // Pre-fill city if available from policy or default to Bengaluru
        if (citiesData.length > 0) {
          const hasBengaluru = citiesData.some(c => c.name.toLowerCase() === 'bengaluru');
          if (hasBengaluru) {
            setSelectedCity('Bengaluru');
          } else {
            setSelectedCity(citiesData[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Update available procedures when specialty changes
  useEffect(() => {
    if (selectedSpecialty && proceduresMap[selectedSpecialty]) {
      setAvailableProcedures(proceduresMap[selectedSpecialty]);
      // If currently selected procedure is not in this specialty, reset it
      if (selectedProcedure && !proceduresMap[selectedSpecialty].includes(selectedProcedure)) {
        setSelectedProcedure('');
      }
    } else {
      setAvailableProcedures([]);
      setSelectedProcedure('');
    }
  }, [selectedSpecialty, proceduresMap]);

  // Execute hospital search whenever filters change
  useEffect(() => {
    performSearch();
  }, [selectedCity, selectedSpecialty, selectedProcedure, selectedRoom, networkOnly]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchHospitals({
        policyId: policy._id,
        policy,
        city: selectedCity,
        specialty: selectedSpecialty || undefined,
        procedure: selectedProcedure || undefined,
        roomType: selectedRoom,
        networkOnly
      });

      setHospitals(res.hospitals);
      setTotalCount(res.totalCount);
      setTotalCityHospitals(res.totalCityHospitals || 0);
      setNetworkFacilityCount(res.networkFacilityCount || 0);
      setSpecialtyMatchedCount(res.specialtyMatchedCount || 0);
      setProcedureMatchedCount(res.procedureMatchedCount || 0);
      setCityAverageCost(res.cityAverageCost);
      setIsFallbackNetwork(Boolean(res.isFallbackNetwork));
      setDisplayCount(12);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search hospitals.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedSpecialty('');
    setSelectedProcedure('');
    setSelectedRoom('General Ward');
    setNetworkOnly(false);
  };

  const handleOpenModal = (item: RankedHospitalItem) => {
    setSelectedHospitalForModal(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHospitalForModal(null);
  };

  // Determine Precision Level Badge
  let precisionBadge = 'City Broad Average';
  let precisionClass = 'badge-tier';
  if (selectedProcedure) {
    precisionBadge = `Procedure-Level Estimate: ${selectedProcedure}`;
    precisionClass = 'badge-exact';
  } else if (selectedSpecialty) {
    precisionBadge = `Specialty Average: ${selectedSpecialty}`;
    precisionClass = 'badge-specialty';
  }

  // Format Room Limit nicely
  const getRoomLimitDisplay = () => {
    if (!policy.roomLimit) return 'No Capping';
    if (policy.roomLimit.type === 'amount') return `₹${Number(policy.roomLimit.value).toLocaleString('en-IN')}/day`;
    if (policy.roomLimit.type === 'percent') return `${policy.roomLimit.value}% of SI`;
    if (policy.roomLimit.type === 'category') return String(policy.roomLimit.value);
    return 'Unlimited';
  };

  return (
    <div className="discovery-container">
      {/* 1. Policy Summary Context Bar */}
      <section className="policy-context-banner">
        <div className="policy-context-left">
          <div className="policy-badge-icon">
            <ShieldCheck size={22} color="var(--color-primary)" />
          </div>
          <div>
            <div className="policy-context-title">
              <strong>{policy.insurer}</strong>
              {policy.planName && <span className="policy-plan-subtitle">({policy.planName})</span>}
            </div>
            <div className="policy-terms-chips">
              <span className="policy-chip">
                Sum Insured: <strong>{formatINR(policy.sumInsured || 0)}</strong>
              </span>
              <span className="policy-chip">
                Co-pay: <strong>{policy.copay ?? 0}%</strong>
              </span>
              <span className="policy-chip">
                Room Limit: <strong>{getRoomLimitDisplay()}</strong>
              </span>
              {policy.proportionateDeduction && (
                <span className="policy-chip chip-warning">
                  Proportionate Deduction: <strong>Active</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="policy-context-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBackToPolicy}
            title="Edit room limits or co-pay"
          >
            Review Policy Terms
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onResetPolicy}
            title="Upload another policy"
          >
            Upload New Policy
          </button>
        </div>
      </section>

      {/* 2. Cascading Search & Context Filters */}
      <section className="filter-card">
        <div className="filter-card-header">
          <div className="filter-card-title">
            <SlidersHorizontal size={18} color="var(--color-primary)" />
            <h3>Hospital & Treatment Cost Search</h3>
          </div>
          {(selectedSpecialty || selectedProcedure || selectedRoom !== 'General Ward') && (
            <button
              type="button"
              className="btn-link text-muted"
              onClick={handleClearFilters}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>

        <div className="filters-grid">
          {/* City Selector (Required) */}
          <div className="filter-group">
            <label htmlFor="city-select" className="filter-label">
              <MapPin size={15} color="var(--color-primary)" /> City (Required)
            </label>
            <div className="select-wrapper">
              <select
                id="city-select"
                className="filter-select"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
              >
                {cities.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count} hospitals)
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          {/* Specialty Selector (Optional) */}
          <div className="filter-group">
            <label htmlFor="specialty-select" className="filter-label">
              <Stethoscope size={15} color="var(--color-primary)" /> Clinical Specialty (Optional)
            </label>
            <div className="select-wrapper">
              <select
                id="specialty-select"
                className="filter-select"
                value={selectedSpecialty}
                onChange={e => setSelectedSpecialty(e.target.value)}
              >
                <option value="">All Specialties (General Healthcare)</option>
                {specialties.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          {/* Procedure Selector (Optional, cascaded) */}
          <div className="filter-group">
            <label htmlFor="procedure-select" className="filter-label">
              <Activity size={15} color="var(--color-primary)" /> Medical / Surgical Procedure (Optional)
            </label>
            <div className="select-wrapper">
              <select
                id="procedure-select"
                className="filter-select"
                value={selectedProcedure}
                onChange={e => setSelectedProcedure(e.target.value)}
                disabled={!selectedSpecialty || availableProcedures.length === 0}
              >
                <option value="">
                  {selectedSpecialty ? 'All Procedures in this Specialty' : 'Select a specialty first'}
                </option>
                {availableProcedures.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          {/* Room Category */}
          <div className="filter-group">
            <label htmlFor="room-select" className="filter-label">
              <Bed size={15} color="var(--color-primary)" /> Room Category
            </label>
            <div className="select-wrapper">
              <select
                id="room-select"
                className="filter-select"
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value as RoomCategory)}
              >
                <option value="General Ward">General Ward (Budget / Standard)</option>
                <option value="Twin Sharing">Twin Sharing (Moderate)</option>
                <option value="Single Private Room">Single Private Room (Premium)</option>
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          {/* Verified Network Toggle */}
          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label
              className="filter-label"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '42px',
                padding: '0 12px',
                background: networkOnly ? '#ecfdf5' : '#f9fafb',
                borderRadius: '8px',
                border: `1px solid ${networkOnly ? 'var(--color-primary)' : '#e5e7eb'}`,
                marginBottom: 0
              }}
            >
              <input
                type="checkbox"
                checked={networkOnly}
                onChange={e => setNetworkOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: networkOnly ? 'var(--color-primary)' : 'inherit' }}>
                Verified Network Only
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* 3. Results Summary Strip */}
      <section className="results-summary-strip">
        <div className="summary-left">
          <span className={`status-pill ${precisionClass}`}>
            {precisionBadge}
          </span>
          <span className="results-count-text">
            {selectedProcedure ? (
              <span>
                <strong>{totalCount}</strong> matching procedure <em>{selectedProcedure}</em>
                {specialtyMatchedCount > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                    (of {specialtyMatchedCount} matching {selectedSpecialty} • {networkFacilityCount} reference network facilities in {selectedCity})
                  </span>
                )}
              </span>
            ) : selectedSpecialty ? (
              <span>
                <strong>{totalCount}</strong> matching <em>{selectedSpecialty}</em> in {selectedCity}
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                  ({networkFacilityCount > 0 ? `${networkFacilityCount} reference network facilities for ${policy.insurer}` : 'reference dataset'}
                  {procedureMatchedCount !== undefined ? ` • ${procedureMatchedCount} procedures` : ''})
                </span>
              </span>
            ) : networkOnly ? (
              <span>
                <strong>{totalCount}</strong> verified network facilit{totalCount === 1 ? 'y' : 'ies'} in {selectedCity} for {policy.insurer}
              </span>
            ) : isFallbackNetwork ? (
              <span>
                <strong>{totalCount}</strong> facilities listed in {selectedCity} (<em>Network status unverified for {policy.insurer}</em>)
              </span>
            ) : (
              <span>
                <strong>{totalCount}</strong> reference network facilit{totalCount === 1 ? 'y' : 'ies'} in {selectedCity} for {policy.insurer}
                {totalCityHospitals > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-subtle)', marginLeft: '6px' }}>
                    (of {totalCityHospitals} total facilities in city)
                  </span>
                )}
              </span>
            )}
          </span>
        </div>

        {totalCount > 0 && cityAverageCost > 0 && (
          <div className="summary-right">
            <div className="stat-pill">
              <span className="stat-label">Typical Average Cost:</span>
              <span className="stat-value">{formatINR(cityAverageCost)}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Selected Room:</span>
              <span className="stat-value">{selectedRoom}</span>
            </div>
          </div>
        )}
      </section>

      {/* Error state */}
      {error && (
        <div className="alert-card alert-danger" style={{ margin: '20px 0' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-grid-placeholder">
          {[1, 2, 3].map(n => (
            <div key={n} className="hospital-card card-skeleton">
              <div className="skeleton-header" />
              <div className="skeleton-body" />
              <div className="skeleton-pricing" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && hospitals.length === 0 && (
        <div className="empty-results-box">
          <Building2 size={48} color="var(--color-text-subtle)" />
          <h3>No Matching Facilities Found</h3>
          <p>
            {networkOnly
              ? `No verified network facilities found for ${policy.insurer} in ${selectedCity} matching the selected filters. Try unchecking "Verified Network Only" to discover other facilities in this city.`
              : `We couldn't find hospitals in ${selectedCity} offering the selected combination under reference data for ${policy.insurer}.`}
          </p>
          <button type="button" className="btn btn-primary" onClick={handleClearFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {/* 4. Ranked Hospital Cards List */}
      {!loading && hospitals.length > 0 && (
        <div className="hospitals-list-grid">
          {hospitals.slice(0, displayCount).map(item => {
            const h = item.hospital;
            const est = item.estimate;
            const score = item.score;
            const isGovt = String(h.hospital_type).toLowerCase() === 'government';

            return (
              <article
                key={`${h.hospital_name}-${h.address}`}
                className="hospital-card rank-card"
              >
                {/* Card Top: Rank & Score Banner */}
                <div className="rank-badge-row">
                  <div className={`rank-pill ${item.rank <= 3 ? 'rank-top' : ''}`}>
                    <span className="rank-num">#{item.rank}</span>
                    <span className="rank-text">
                      {item.rank === 1
                        ? 'Highest SehatSure Score'
                        : item.rank === 2
                        ? 'Lower Estimated Patient Cost'
                        : 'Strong Policy-Cost Fit'}
                    </span>
                  </div>
                  <div
                    className="score-badge"
                    title="Ranked by SehatSure's decision-support model (coverage fit, estimated patient cost, hospital attributes, and co-pay exposure). It does not represent a clinical recommendation or guarantee of hospital quality."
                  >
                    <ShieldCheck size={13} />
                    <strong>{score.finalScore}</strong>
                    <small>/100</small>
                  </div>
                </div>

                {/* Formula Score Weight Breakdown Chips */}
                <div className="score-breakdown-chips">
                  <span
                    className="sc-chip"
                    title="Score reflects how the estimated treatment cost compares with the available sum insured and other modeled policy factors. It does not confirm claim eligibility."
                  >
                    Sum-Insured Fit: <strong>{score.coverageFit}/100</strong>
                  </span>
                  <span
                    className="sc-chip"
                    title="PatientCostFit (25%): Lower estimated out-of-pocket patient share gets a higher score."
                  >
                    Cost Fit: <strong>{score.patientCostFit}/100</strong>
                  </span>
                  <span
                    className="sc-chip"
                    title="HospitalTypeScore (15%): Facility tier and segment classification."
                  >
                    Tier: <strong>{score.hospitalTypeScore}/100</strong>
                  </span>
                  <span
                    className="sc-chip"
                    title="CoPayFit (10%): Co-pay adjusted financial buffer within available sum insured."
                  >
                    Co-pay: <strong>{score.coPayFit}/100</strong>
                  </span>
                </div>

                {/* Hospital Basic Info */}
                <div className="card-header">
                  <div className="card-title-row">
                    <h3 className="hospital-name" title={h.hospital_name}>
                      {h.hospital_name}
                    </h3>
                    {h.rating > 0 ? (
                      <span className="rating-badge">★ {h.rating.toFixed(1)}</span>
                    ) : (
                      <span className="rating-badge rating-na">Unrated</span>
                    )}
                  </div>

                  <div className="card-badges">
                    <span className={`badge ${isGovt ? 'badge-govt' : 'badge-pvt'}`}>
                      {h.hospital_type}
                    </span>
                    <span className="badge badge-segment">{h.segment}</span>
                    <span className="badge badge-tier">{h.tier}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <p className="hospital-address" title={h.address}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{h.address}</span>
                  </p>

                  <div className="card-section">
                    <div className="section-label">Specialties</div>
                    <div className="chips-container">
                      {h.specialties && h.specialties.length > 0 ? (
                        <>
                          {h.specialties.slice(0, 3).map(s => (
                            <span
                              key={s}
                              className={`chip ${selectedSpecialty && s.toLowerCase().includes(selectedSpecialty.toLowerCase()) ? 'chip-highlight' : ''}`}
                            >
                              {s}
                            </span>
                          ))}
                          {h.specialties.length > 3 && (
                            <span className="chip chip-more">+{h.specialties.length - 3}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">General healthcare</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-subtle)', marginTop: '5px' }}>
                      Specialties listed in SehatSure reference dataset
                    </div>
                  </div>

                  <div className="card-section">
                    <div className="section-label">Network Status</div>
                    {item.networkStatus === 'verified' ? (
                      <div>
                        <div className="network-status-text" title="Hospital matched to selected insurer in SehatSure's reference network data. Confirm current cashless eligibility before admission.">
                          <CheckCircle2 size={14} color="var(--color-primary)" />
                          <span>Network Match — Confirm Cashless Eligibility</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                          Hospital matched to the selected insurer in SehatSure's reference network data.
                        </div>
                      </div>
                    ) : item.networkStatus === 'unverified' ? (
                      <div>
                        <div className="network-status-text text-muted" title="Hospital found in reference dataset, but current insurer-network status could not be verified.">
                          <AlertCircle size={14} color="#D97706" />
                          <span style={{ color: '#B45309' }}>Network Status Unverified</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                          Hospital found in our reference dataset, but current insurer-network status could not be verified.
                        </div>
                      </div>
                    ) : item.networkStatus === 'no_match' ? (
                      <div>
                        <div className="network-status-text text-muted">
                          <AlertCircle size={14} color="#DC2626" />
                          <span style={{ color: '#DC2626' }}>No Network Match Found</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                          No matching insurer-network record was found in the available reference data.
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="network-status-text text-muted">
                          <AlertCircle size={14} color="var(--color-text-subtle)" />
                          <span>Network Status Unknown</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                          Insufficient reference network data to determine empanelment.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Estimates Section */}
                <div className="card-pricing">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="price-range-label">Estimated Cost Range</span>
                    {est.estimateLevelLabel && (
                      <span className="badge badge-estimate-level" style={{ fontSize: '0.72rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '2px 6px' }}>
                        {est.estimateLevelLabel}
                      </span>
                    )}
                  </div>
                  <div className="price-header" style={{ marginTop: 0 }}>
                    <div className="price-range-val">
                      {formatINR(est.displayLow)} – {formatINR(est.displayHigh)}
                    </div>
                  </div>

                  <div className="price-typical">
                    <span className="label">Typical Estimated Cost:</span>
                    <span className="value">{formatINR(est.totalCost)}</span>
                  </div>

                  <div className="price-meta">
                    <span>Stay: <strong>{est.estimatedStayDays} days</strong></span>
                    <span>Room: <strong>{selectedRoom}</strong></span>
                  </div>

                  {/* Highlighted Patient Out-of-Pocket Share */}
                  <div className="patient-payable-banner">
                    <div className="payable-label-group">
                      <span className="payable-title">Estimated Patient Share:</span>
                      <span className="payable-sub">
                        (Indicative out-of-pocket estimate; {policy.copay ?? 0}% co-pay
                        {score.deductibleApplied && score.deductibleApplied > 0 ? ` + ${formatINR(score.deductibleApplied)} deductible` : ''}
                        {score.excessOverSI > 0 ? ` + ${formatINR(score.excessOverSI)} over SI` : ''})
                      </span>
                    </div>
                    <div className="payable-amount">
                      {formatINR(score.patientPayable)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-breakdown"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenModal(item)}
                    >
                      <span>Estimated Breakdown</span>
                      <ArrowRight size={14} />
                    </button>
                    {onStartCareJourney && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => onStartCareJourney(item, selectedRoom, selectedProcedure)}
                        title="Navigate 5-Stage Insurance-Aware Care Journey"
                      >
                        <span>Navigate Journey</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {!loading && hospitals.length > displayCount && (
        <div style={{ textAlign: 'center', margin: '32px 0' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDisplayCount(prev => prev + 12)}
          >
            Load More Hospitals ({hospitals.length - displayCount} remaining)
          </button>
        </div>
      )}

      {/* Detailed Bill Breakdown Modal */}
      {selectedHospitalForModal && (
        <BillBreakdownModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          hospitalName={selectedHospitalForModal.hospital.hospital_name}
          hospitalAddress={selectedHospitalForModal.hospital.address}
          hospitalCity={selectedHospitalForModal.hospital.city}
          hospitalId={selectedHospitalForModal.hospital.hospital_id}
          hospitalSegment={selectedHospitalForModal.hospital.segment}
          hospitalTier={selectedHospitalForModal.hospital.tier}
          hospitalRating={selectedHospitalForModal.hospital.rating}
          initialRoomType={selectedRoom}
          policyId={policy._id}
          policy={policy}
          specialty={selectedSpecialty}
          procedure={selectedProcedure}
          onStartCareJourney={(room) => {
            handleCloseModal();
            onStartCareJourney?.(selectedHospitalForModal, room, selectedProcedure);
          }}
        />
      )}
    </div>
  );
};
