import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  ChevronDown,
  Plus,
  Check,
  Layers,
  X
} from 'lucide-react';
import { PolicyDocument } from '../types/policy';
import { RankedHospitalItem, RoomCategory } from '../types/hospital';
import { fetchCities, fetchTaxonomy, searchHospitals } from '../services/hospitalApi';
import { BillBreakdownModal } from '../components/BillBreakdownModal';

interface FindHospitalsPageProps {
  policy: PolicyDocument;
  onStartCareJourney: (hospital: RankedHospitalItem, room: RoomCategory, procedure?: string) => void;
  onNavigateToComparison: (hospitals: RankedHospitalItem[]) => void;
  comparisonHospitals?: RankedHospitalItem[];
  onToggleCompareHospital?: (hospital: RankedHospitalItem) => void;
  onClearComparison?: () => void;
}

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export const FindHospitalsPage: React.FC<FindHospitalsPageProps> = ({
  policy,
  onStartCareJourney,
  onNavigateToComparison,
  comparisonHospitals = [],
  onToggleCompareHospital,
  onClearComparison
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Neurology');
  const [selectedRoom] = useState<RoomCategory>('General Ward');
  const [selectedInsurer, setSelectedInsurer] = useState<string>(policy.insurer || 'HDFC ERGO');

  const [cities, setCities] = useState<{ name: string; count: number }[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [hospitals, setHospitals] = useState<RankedHospitalItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [networkFacilityCount, setNetworkFacilityCount] = useState<number>(0);
  const [totalCityHospitals, setTotalCityHospitals] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedHospitalForModal, setSelectedHospitalForModal] = useState<RankedHospitalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Local fallback if parent didn't provide comparison handler
  const [localCompareList, setLocalCompareList] = useState<RankedHospitalItem[]>([]);
  const activeCompareList = comparisonHospitals.length > 0 ? comparisonHospitals : localCompareList;

  const isHospitalInCompare = (item: RankedHospitalItem) => {
    return activeCompareList.some(
      (c) =>
        c.hospital.hospital_name === item.hospital.hospital_name &&
        c.hospital.address === item.hospital.address
    );
  };

  const handleToggleCompare = (item: RankedHospitalItem) => {
    if (onToggleCompareHospital) {
      onToggleCompareHospital(item);
    } else {
      setLocalCompareList((prev) => {
        const exists = prev.some(
          (c) =>
            c.hospital.hospital_name === item.hospital.hospital_name &&
            c.hospital.address === item.hospital.address
        );
        if (exists) {
          return prev.filter(
            (c) =>
              !(
                c.hospital.hospital_name === item.hospital.hospital_name &&
                c.hospital.address === item.hospital.address
              )
          );
        } else {
          if (prev.length >= 3) {
            alert('You can compare up to 3 hospitals at a time.');
            return prev;
          }
          return [...prev, item];
        }
      });
    }
  };

  const handleClearCompare = () => {
    if (onClearComparison) {
      onClearComparison();
    } else {
      setLocalCompareList([]);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cData, tData] = await Promise.all([fetchCities(), fetchTaxonomy()]);
        setCities(cData);
        setSpecialties(tData.specialties || []);
      } catch (err) {
        console.error('Failed to load cities/taxonomy:', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    runSearch();
  }, [selectedCity, selectedSpecialty, selectedRoom]);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchHospitals({
        policyId: policy._id,
        policy,
        city: selectedCity,
        specialty: selectedSpecialty || undefined,
        roomType: selectedRoom,
        networkOnly: false
      });
      setHospitals(res.hospitals);
      setTotalCount(res.totalCount);
      setNetworkFacilityCount(res.networkFacilityCount || 0);
      setTotalCityHospitals(res.totalCityHospitals || 0);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search hospitals.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="find-hospitals-view">
      {/* 1. Top Horizontal Filter Bar */}
      <section className="hosp-filter-bar">
        <div className="hosp-filter-group">
          <label className="hosp-filter-label" htmlFor="filter-city">
            City
          </label>
          <div className="select-pill-wrap">
            <select
              id="filter-city"
              className="hosp-filter-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              {cities.length === 0 && <option value="Bengaluru">Bengaluru</option>}
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>

        <div className="hosp-filter-group">
          <label className="hosp-filter-label" htmlFor="filter-spec">
            Specialty
          </label>
          <div className="select-pill-wrap">
            <select
              id="filter-spec"
              className="hosp-filter-select"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
            >
              <option value="">All Specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {!specialties.includes('Neurology') && <option value="Neurology">Neurology</option>}
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>

        <div className="hosp-filter-group">
          <label className="hosp-filter-label" htmlFor="filter-ins">
            Insurer
          </label>
          <div className="select-pill-wrap">
            <select
              id="filter-ins"
              className="hosp-filter-select"
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}
            >
              <option value={policy.insurer || ''}>{policy.insurer || 'Selected Insurer'}</option>
              <option value="HDFC ERGO">HDFC ERGO</option>
              <option value="Star Health">Star Health</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>

        <div className="hosp-filter-action">
          <button type="button" className="btn btn-primary" onClick={runSearch}>
            Search Hospitals
          </button>
        </div>
      </section>

      {/* 2. Results Header Strip */}
      <section className="hosp-results-strip">
        <div className="results-strip-left">
          <span className="results-found-text">
            <strong>{totalCount}</strong> reference-network facilities found in {selectedCity}
          </span>
          <span
            className="results-info-tooltip"
            title="Hospitals listed under selected insurer in SehatSure's reference dataset. Always confirm cashless desk status prior to admission."
          >
            <Info size={14} />
          </span>
          {networkFacilityCount > 0 && (
            <span className="results-sub-text">
              ({networkFacilityCount} facilities match insurer • of {totalCityHospitals} total facilities in city)
            </span>
          )}
        </div>

        <div className="results-strip-right">
          {activeCompareList.length > 0 ? (
            <button
              type="button"
              className={`btn ${activeCompareList.length >= 2 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              disabled={activeCompareList.length < 2}
              onClick={() => onNavigateToComparison(activeCompareList)}
              title={activeCompareList.length < 2 ? 'Select at least 2 facilities to compare' : 'Open comparison view'}
            >
              <Layers size={14} />
              <span>
                {activeCompareList.length >= 2
                  ? `Compare Selected (${activeCompareList.length})`
                  : 'Select 1 More to Compare'}
              </span>
              <ArrowRight size={14} />
            </button>
          ) : (
            hospitals.length >= 2 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToComparison(hospitals.slice(0, 2))}
                title="Select facilities below using '+ Compare' or click to compare top candidates"
              >
                <Layers size={14} />
                <span>Compare Facilities</span>
                <ArrowRight size={14} />
              </button>
            )
          )}

          <div className="sort-by-wrap">
            <span className="sort-label">Sort by</span>
            <select className="sort-select" defaultValue="score">
              <option value="score">Policy Fit (High to Low)</option>
              <option value="cost">Estimated Cost (Low to High)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Loading, Error, Empty States */}
      {error && (
        <div className="alert-card alert-danger" style={{ margin: '20px 0' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {loading && (
        <div className="hosp-loading-list">
          {[1, 2, 3].map((n) => (
            <div key={n} className="hosp-card-horizontal skeleton-card">
              <div className="skeleton-avatar" />
              <div className="skeleton-content" />
              <div className="skeleton-action" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Horizontal Hospital Cards List */}
      {!loading && hospitals.length > 0 && (
        <div className="hosp-cards-list">
          {hospitals.slice(0, 15).map((item) => {
            const h = item.hospital;
            const score = item.score;
            const est = item.estimate;
            const isCompared = isHospitalInCompare(item);

            return (
              <article
                key={`${h.hospital_name}-${h.address}`}
                className={`hosp-card-horizontal ${isCompared ? 'hosp-card-in-compare' : ''}`}
              >
                {/* Facility Icon / Graphic */}
                <div className="hosp-avatar-box">
                  <Building2 size={24} className="text-primary" />
                </div>

                {/* Main Information */}
                <div className="hosp-info-col">
                  <div className="hosp-name-row">
                    <h3 className="hosp-title">{h.hospital_name}</h3>
                    <span className="hosp-tier-badge">
                      {h.tier ? `Facility Tier: ${h.tier}` : 'Dataset Listed Facility'}
                    </span>
                  </div>

                  <p className="hosp-address-text">
                    <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    {h.address}
                  </p>

                  <div className="hosp-tags-row">
                    {h.specialties && h.specialties.length > 0 ? (
                      h.specialties.slice(0, 2).map((s) => (
                        <span key={s} className="hosp-tag-pill">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="hosp-tag-pill">General Specialties</span>
                    )}
                    <span className="specialty-provenance-tag">
                      Reference Dataset Match
                    </span>
                  </div>
                </div>

                {/* Policy Fit Score Pill */}
                <div
                  className="hosp-score-col"
                  title="Policy Fit Score measures policy room rent cap alignment and reference network listing. It does not evaluate doctor skill or medical quality."
                >
                  <div className="fit-score-pill">
                    <span className="fit-score-number">{score.finalScore}</span>
                    <span className="fit-score-text">Policy Fit</span>
                  </div>
                  <span className="fit-score-sub">Financial Alignment</span>
                </div>

                {/* Network Status Column */}
                <div className="hosp-network-col">
                  <div className="network-status-indicator">
                    <CheckCircle2 size={16} className="text-success" />
                    <div>
                      <span className="network-status-title">Reference match</span>
                      <span className="network-status-sub">Confirm cashless eligibility</span>
                    </div>
                  </div>
                  <div className="indicative-cost-text">
                    Est. Cost: <strong>{formatINR(est.totalCost)}</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="hosp-actions-col">
                  <button
                    type="button"
                    className={`btn btn-sm ${isCompared ? 'btn-compare-active' : 'btn-outline'}`}
                    onClick={() => handleToggleCompare(item)}
                    title={isCompared ? 'Remove from comparison' : 'Add to hospital comparison (max 3)'}
                  >
                    {isCompared ? (
                      <>
                        <Check size={14} className="text-success" />
                        <span>In Compare</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Compare</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedHospitalForModal(item);
                      setIsModalOpen(true);
                    }}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onStartCareJourney(item, selectedRoom, selectedSpecialty)}
                  >
                    Navigate Journey
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 5. Sticky Floating Comparison Tray */}
      {activeCompareList.length > 0 && (
        <aside className="compare-dock-tray" aria-label="Selected facilities for comparison">
          <div className="compare-dock-inner">
            <div className="compare-dock-info">
              <div className="compare-dock-badge">
                <Layers size={15} />
                <span>Compare ({activeCompareList.length}/3)</span>
              </div>
              <div className="compare-dock-chips">
                {activeCompareList.map((c) => (
                  <span
                    key={`${c.hospital.hospital_name}-${c.hospital.address}`}
                    className="compare-dock-chip"
                  >
                    <span className="chip-name">{c.hospital.hospital_name}</span>
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={() => handleToggleCompare(c)}
                      title="Remove facility from comparison"
                      aria-label={`Remove ${c.hospital.hospital_name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="compare-dock-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleClearCompare}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={activeCompareList.length < 2}
                onClick={() => onNavigateToComparison(activeCompareList)}
              >
                <span>
                  {activeCompareList.length >= 2
                    ? `Compare Facilities (${activeCompareList.length})`
                    : 'Select 1 More to Compare'}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Bill Breakdown Modal */}
      {selectedHospitalForModal && (
        <BillBreakdownModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHospitalForModal(null);
          }}
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
          onStartCareJourney={(room) => {
            setIsModalOpen(false);
            onStartCareJourney(selectedHospitalForModal, room, selectedSpecialty);
          }}
        />
      )}
    </div>
  );
};

