export type RoomCategory = 'General Ward' | 'Twin Sharing' | 'Single Private Room';

export interface Hospital {
  _id: string;
  name: string;
  networkInsurers: string[];
  city: string;
  zone: string;
  tier: string;
  cashlessSupported: boolean;
  empanelledSchemes: string[];
  roomCategories: { name: string; dailyRate: number }[];
  procedureCostEstimates: Record<string, number>;
}

export interface HospitalRecord {
  hospital_id?: string;
  hospital_name: string;
  hospital_type: 'Private' | 'Government' | string;
  address: string;
  city: string;
  insurers: string[];
  insurersRaw: string;
  rating: number;
  specialties: string[];
  tier: string;
  segment: string;
}

export interface CostRecord {
  tier: string;
  specialty: string;
  procedure: string;
  low_cost: number;
  highest_cost: number;
  mean_cost: number;
  estimated_stay_days: number;
  general_ward_cost_per_day: number;
  twin_sharing_cost_per_day: number;
  single_private_room_cost_per_day: number;
  isAggregate?: boolean;
}

export interface HospitalEstimate {
  available: boolean;
  level: 'procedure' | 'specialty' | 'tier' | 'unavailable';
  estimateLevel: 'procedure' | 'specialty' | 'tier' | 'unavailable';
  estimateBasis: 'procedure_reference' | 'specialty_reference' | 'tier_reference' | 'hospital_modeled' | 'fallback_reference';
  estimateLevelLabel: string;
  lowCost: number;
  meanCost: number;
  highestCost: number;
  segmentAdjustedCost: number;
  hospitalVariation: number;
  treatmentCost: number;
  roomCost: number;
  totalCost: number;
  displayLow: number;
  displayHigh: number;
  estimatedStayDays: number;
  roomCostPerDay: number;
  generalWardRate?: number;
  twinSharingRate?: number;
  singlePrivateRate?: number;
}

export interface ScoreBreakdown {
  coverageFit: number;      // 0 - 100 (50% weight)
  patientCostFit: number;   // 0 - 100 (25% weight)
  hospitalTypeScore: number;// 0 - 100 (15% weight)
  coPayFit: number;         // 0 - 100 (10% weight)
  finalScore: number;       // 0 - 100
  patientPayable: number;
  estimatedPatientShare?: number;
  coPayAmount: number;
  excessOverSI: number;
  deductibleApplied?: number;
}

export type NetworkStatus = 'verified' | 'unverified' | 'no_match' | 'unknown';
export type SpecialtyStatus = 'DATASET_LISTED' | 'INDEPENDENTLY_VERIFIED' | 'UNKNOWN';
export type NetworkMatchProvenance = 'NETWORK_VERIFIED' | 'NETWORK_REFERENCE_MATCH' | 'NETWORK_UNKNOWN' | 'NETWORK_NOT_MATCHED';

export interface RankedHospitalItem {
  hospital: HospitalRecord;
  estimate: HospitalEstimate;
  score: ScoreBreakdown;
  rank: number;
  networkStatus: NetworkStatus;
  specialtyStatus?: SpecialtyStatus;
  networkProvenance?: NetworkMatchProvenance;
  isEmpanelled?: boolean;
}

export interface HospitalSearchResponse {
  hospitals: RankedHospitalItem[];
  totalCount: number;
  cityAverageCost: number;
  isFallbackNetwork: boolean;
  totalCityHospitals?: number;
  networkFacilityCount?: number;
  specialtyMatchedCount?: number;
  procedureMatchedCount?: number;
}

export interface ItemizedBill {
  roomCharges: number;
  roomRatePerDay: number;
  stayDays: number;
  procedureCharges: number;
  medicineCharges: number;
  doctorFees: number;
  otherCharges: number;
  totalBill: number;
}

export interface PolicyImpactBreakdown {
  roomType?: RoomCategory;
  itemizedBill: ItemizedBill;
  roomLimitEligiblePerDay: number;
  roomLimitType: string;
  roomRentExcessPerDay: number;
  totalRoomRentExcess: number;
  proportionateDeductionActive: boolean;
  proportionateDisallowance: number;
  copayPercent: number;
  copayAmount: number;
  policyDeductible: number;
  deductibleApplied: number;
  excessOverSumInsured: number;
  nonMedicalDeductible: number;
  totalPatientPayable: number;
  totalInsuranceCovered: number;
  estimatedPatientShare: number;
  estimatedInsurerShare: number;
  reconciled: boolean;
  allowedBeforeSublimit?: number;
  diseaseSublimit?: number | null;
  diseaseSublimitDisallowance?: number;
  sublimitMatchedClause?: string | null;
  explanationSteps?: string[];
  estimateLevel?: 'procedure' | 'specialty' | 'tier' | 'unavailable';
  estimateBasis?: 'procedure_reference' | 'specialty_reference' | 'tier_reference' | 'hospital_modeled' | 'fallback_reference';
  estimateLevelLabel?: string;
  aiRecommendations: {
    type: 'warning' | 'info' | 'success' | 'suggestion';
    title: string;
    message: string;
    actionable?: string;
  }[];
}
