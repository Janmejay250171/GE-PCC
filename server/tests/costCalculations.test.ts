import { describe, it, expect, beforeAll } from 'vitest';
import { hospitalService, ESTIMATION_ASSUMPTIONS } from '../src/services/hospitalService.js';
import { PolicyDocument } from '../src/types/policy.js';

function createMockPolicy(overrides: Partial<PolicyDocument> = {}): PolicyDocument {
  return {
    _id: 'test_policy_' + Math.random().toString(36).substring(7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedByUser: true,
    insurer: 'Star Health',
    insurerAliases: ['Star Health and Allied Insurance'],
    planName: 'Comprehensive Health Plan',
    policyType: 'private',
    policyNumber: 'P/1000/2026',
    uin: 'SHAHLIP26046V092526',
    policyStartDate: '2026-01-01',
    policyEndDate: '2026-12-31',
    zone: 'Zone A',
    networkType: 'all-network',
    tpa: 'Medi Assist',
    insuredPersons: [],
    sumInsured: 500000,
    roomLimit: { type: 'amount', value: 5000 },
    icuLimit: null,
    copay: 0,
    nonNetworkCopay: null,
    copayConditions: {},
    deductible: 0,
    proportionateDeduction: true,
    subLimits: {},
    restorationBenefit: true,
    cumulativeBonus: 0,
    exclusions: [],
    hasOtherExclusions: false,
    waitingPeriods: null,
    preHospitalizationDays: 30,
    postHospitalizationDays: 60,
    daycareCovered: true,
    ambulanceLimit: 2000,
    preAuthHours: 6,
    claimIntimationHours: 24,
    sourceSnippets: {},
    confidence: {},
    rawTextRef: null,
    ...overrides
  };
}

describe('Cost Estimation & Insurance Calculation Engine', () => {
  beforeAll(async () => {
    await hospitalService.initData();
  }, 30000);

  describe('Centralized Financial Assumptions', () => {
    it('should define transparent and auditable prototype assumptions', () => {
      expect(ESTIMATION_ASSUMPTIONS.doctorFeeShare).toBe(0.20);
      expect(ESTIMATION_ASSUMPTIONS.medicineLabShare).toBe(0.10);
      expect(ESTIMATION_ASSUMPTIONS.nonMedicalShare).toBe(0.05);
      expect(ESTIMATION_ASSUMPTIONS.defaultSumInsured).toBe(500000);
      expect(ESTIMATION_ASSUMPTIONS.defaultCopay).toBe(0);
      expect(ESTIMATION_ASSUMPTIONS.defaultDeductible).toBe(0);
      expect(ESTIMATION_ASSUMPTIONS.minStayDays).toBe(1);
    });
  });

  describe('Estimate Level & Source Basis', () => {
    it('should identify procedure-level granularity when procedure is matched', () => {
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'General Ward');

      expect(est.available).toBe(true);
      expect(est.estimateLevel).toBe('procedure');
      expect(est.estimateBasis).toBe('procedure_reference');
      expect(est.estimateLevelLabel).toBe('Procedure-Level Estimate');
    });

    it('should fall back to specialty average when procedure is unknown', () => {
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'NonExistentProcedure123', 'General Ward');

      expect(est.available).toBe(true);
      expect(est.estimateLevel).toBe('specialty');
      expect(est.estimateBasis).toBe('specialty_reference');
      expect(est.estimateLevelLabel).toBe('Specialty Average Estimate');
    });

    it('should fall back to city tier average when specialty is unknown', () => {
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'UnknownSpecialtyXYZ', undefined, 'General Ward');

      expect(est.available).toBe(true);
      expect(est.estimateLevel).toBe('tier');
      expect(est.estimateBasis).toBe('tier_reference');
      expect(est.estimateLevelLabel).toBe('City Tier Average Estimate');
    });

    it('should report unavailable status when cost lookup completely fails', () => {
      const dummyHospital: any = {
        hospital_name: 'Ghost Clinic',
        hospital_type: 'UnknownType',
        tier: 'TierDoesNotExist',
        segment: 'Budget/Local',
        address: 'Nowhere',
        city: 'GhostCity'
      };
      const est = hospitalService.calculateHospitalEstimate(dummyHospital, 'NonExistentSpecialty', 'NonExistentProcedure');

      expect(est.available).toBe(false);
      expect(est.estimateLevel).toBe('unavailable');
      expect(est.estimateBasis).toBe('fallback_reference');
      expect(est.estimateLevelLabel).toBe('Estimate Unavailable');
      expect(est.totalCost).toBe(0);
    });
  });

  describe('Compulsory Policy Deductible', () => {
    it('should apply 0 deductible when policy specifies 0', () => {
      const policy = createMockPolicy({ deductible: 0, copay: 10 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.policyDeductible).toBe(0);
      expect(adj.deductibleApplied).toBe(0);
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
    });

    it('should apply compulsory deductible before co-pay', () => {
      const deductibleVal = 20000;
      const copayPct = 10;
      const policy = createMockPolicy({ deductible: deductibleVal, copay: copayPct });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.policyDeductible).toBe(deductibleVal);
      expect(adj.deductibleApplied).toBe(deductibleVal);

      // Admissible claim = TotalBill - RoomExcess - PropDisallowance - NonMedical
      const admissibleBeforeDed = adj.itemizedBill.totalBill - adj.totalRoomRentExcess - adj.proportionateDisallowance - adj.nonMedicalDeductible;
      const expectedAdmissibleAfterDed = admissibleBeforeDed - deductibleVal;
      const expectedCopay = Math.round(expectedAdmissibleAfterDed * (copayPct / 100));

      expect(adj.copayAmount).toBe(expectedCopay);
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
    });

    it('should cap deductible at admissible amount if deductible exceeds claim', () => {
      const hugeDeductible = 5000000;
      const policy = createMockPolicy({ deductible: hugeDeductible, copay: 10 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.policyDeductible).toBe(hugeDeductible);
      // Deductible applied cannot exceed admissible claim
      expect(adj.deductibleApplied).toBeLessThanOrEqual(adj.itemizedBill.totalBill);
      expect(adj.estimatedInsurerShare).toBe(0);
      expect(adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
      expect(adj.reconciled).toBe(true);
    });

    it('should safely assume default deductible of 0 when deductible is omitted or null', () => {
      const policy = createMockPolicy({ deductible: null });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.policyDeductible).toBe(ESTIMATION_ASSUMPTIONS.defaultDeductible);
      expect(adj.deductibleApplied).toBe(0);
      expect(adj.reconciled).toBe(true);
    });
  });

  describe('Co-payment Calculations', () => {
    it('should calculate 0% co-pay correctly', () => {
      const policy = createMockPolicy({ copay: 0 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.copayPercent).toBe(0);
      expect(adj.copayAmount).toBe(0);
      expect(adj.reconciled).toBe(true);
    });

    it('should calculate non-zero co-pay (e.g. 20%) on admissible claim after deductible', () => {
      const policy = createMockPolicy({ copay: 20, deductible: 10000 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.copayPercent).toBe(20);
      expect(adj.copayAmount).toBeGreaterThan(0);
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
    });

    it('should handle 100% co-pay resulting in 0 insurer share', () => {
      const policy = createMockPolicy({ copay: 100 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.copayPercent).toBe(100);
      expect(adj.estimatedInsurerShare).toBe(0);
      expect(adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
      expect(adj.reconciled).toBe(true);
    });

    it('should default to system assumption 0% co-pay when co-pay is omitted', () => {
      const policy = createMockPolicy({ copay: null });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.copayPercent).toBe(ESTIMATION_ASSUMPTIONS.defaultCopay);
      expect(adj.copayAmount).toBe(0);
      expect(adj.reconciled).toBe(true);
    });
  });

  describe('Room Limit & Potential Proportionate Deduction', () => {
    it('should apply zero room excess and zero proportionate deduction when room rate is below limit', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'amount', value: 50000 }, // generous limit
        proportionateDeduction: true
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'General Ward');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'General Ward');

      expect(adj.totalRoomRentExcess).toBe(0);
      expect(adj.proportionateDisallowance).toBe(0);
      expect(adj.proportionateDeductionActive).toBe(false);
      expect(adj.reconciled).toBe(true);
    });

    it('should detect room excess and calculate proportionate deduction when room exceeds limit and clause is active', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'amount', value: 1000 }, // strict limit
        proportionateDeduction: true
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'Single Private Room');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'Single Private Room');

      if (est.roomCostPerDay > 1000) {
        expect(adj.totalRoomRentExcess).toBeGreaterThan(0);
        expect(adj.proportionateDeductionActive).toBe(true);
        expect(adj.proportionateDisallowance).toBeGreaterThan(0);
      }
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
    });

    it('should NOT apply proportionate deduction if policy does not have proportionate deduction clause', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'amount', value: 1000 },
        proportionateDeduction: false
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'Single Private Room');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'Single Private Room');

      if (est.roomCostPerDay > 1000) {
        expect(adj.totalRoomRentExcess).toBeGreaterThan(0);
      }
      expect(adj.proportionateDeductionActive).toBe(false);
      expect(adj.proportionateDisallowance).toBe(0);
      expect(adj.reconciled).toBe(true);
    });

    // Test A: General Ward limit + Single Private Room selected
    it('Test A: General Ward limit + Single Private Room selected uses general ward benchmark rate', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'category', value: 'General Ward' },
        proportionateDeduction: true
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'Single Private Room');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'Single Private Room');

      expect(est.generalWardRate).toBeGreaterThan(0);
      expect(est.singlePrivateRate).toBeGreaterThan(est.generalWardRate!);
      expect(adj.roomLimitEligiblePerDay).toBe(est.generalWardRate);
      expect(adj.roomRentExcessPerDay).toBe(est.singlePrivateRate! - est.generalWardRate!);
      expect(adj.roomRentExcessPerDay).toBeGreaterThan(0);
      expect(adj.proportionateDeductionActive).toBe(true);
      expect(adj.proportionateDisallowance).toBeGreaterThan(0);
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
    });

    // Test B: General Ward limit + General Ward selected
    it('Test B: General Ward limit + General Ward selected results in zero room excess', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'category', value: 'General Ward' },
        proportionateDeduction: true
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'General Ward');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'General Ward');

      expect(adj.roomLimitEligiblePerDay).toBe(est.generalWardRate);
      expect(adj.roomRentExcessPerDay).toBe(0);
      expect(adj.totalRoomRentExcess).toBe(0);
      expect(adj.proportionateDeductionActive).toBe(false);
      expect(adj.proportionateDisallowance).toBe(0);
      expect(adj.reconciled).toBe(true);
    });

    // Test C: Twin Sharing limit + Single Private Room selected
    it('Test C: Twin Sharing limit + Single Private Room selected uses twin sharing benchmark rate', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'category', value: 'Twin Sharing' },
        proportionateDeduction: true
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty', 'Single Private Room');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy, 'Single Private Room');

      expect(est.twinSharingRate).toBeGreaterThan(0);
      expect(adj.roomLimitEligiblePerDay).toBe(est.twinSharingRate);
      expect(adj.roomRentExcessPerDay).toBe(est.singlePrivateRate! - est.twinSharingRate!);
      expect(adj.roomRentExcessPerDay).toBeGreaterThan(0);
      expect(adj.reconciled).toBe(true);
    });

    // Test D: Percentage room limit
    it('Test D: Percentage room limit (1% of Sum Insured)', () => {
      const policy = createMockPolicy({
        sumInsured: 300000,
        roomLimit: { type: 'percent', value: 1 } // 1% of 300k = 3000/day
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.roomLimitEligiblePerDay).toBe(3000);
      expect(adj.reconciled).toBe(true);
    });

    // Test E: Fixed room limit
    it('Test E: Fixed room limit (e.g. ₹3,500/day)', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'amount', value: 3500 }
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.roomLimitEligiblePerDay).toBe(3500);
      expect(adj.reconciled).toBe(true);
    });

    // Test F: Missing category rate handling safely without inventing a rate
    it('Test F: Missing category rate in dataset does not invent a rate or penalty', () => {
      const policy = createMockPolicy({
        roomLimit: { type: 'category', value: 'General Ward' }
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      // Simulate missing benchmark rate
      const estMissingRates = { ...est, generalWardRate: 0 };
      const adj = hospitalService.calculatePolicyAdjudication(estMissingRates, policy);

      expect(adj.roomLimitEligiblePerDay).toBe(0);
      expect(adj.roomLimitType).toContain('Benchmark rate unavailable');
      expect(adj.roomRentExcessPerDay).toBe(0);
      expect(adj.reconciled).toBe(true);
    });
  });

  describe('Non-Medical Disallowance', () => {
    it('should model non-medical consumables as exactly 5% of total bill', () => {
      const policy = createMockPolicy();
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      const expectedNonMed = Math.round(adj.itemizedBill.totalBill * ESTIMATION_ASSUMPTIONS.nonMedicalShare);
      expect(adj.nonMedicalDeductible).toBe(expectedNonMed);
      expect(adj.reconciled).toBe(true);
    });
  });

  describe('Edge Cases & Sum Insured Ceilings', () => {
    it('should handle treatment cost significantly exceeding Sum Insured', () => {
      const tinySI = 50000;
      const policy = createMockPolicy({ sumInsured: tinySI });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'CABG');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.excessOverSumInsured).toBeGreaterThan(0);
      // Insurer share can never exceed sum insured
      expect(adj.estimatedInsurerShare).toBeLessThanOrEqual(tinySI);
      // Patient share reconciles to totalBill - insurerShare
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
      expect(adj.reconciled).toBe(true);
    });

    it('should handle zero or missing sum insured by falling back to system default 500k', () => {
      const policy = createMockPolicy({ sumInsured: null });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.estimatedInsurerShare).toBeLessThanOrEqual(ESTIMATION_ASSUMPTIONS.defaultSumInsured);
      expect(adj.reconciled).toBe(true);
    });

    it('should never produce negative patient share or negative insurer share', () => {
      const policy = createMockPolicy({
        sumInsured: 10000000,
        copay: 0,
        deductible: 0,
        roomLimit: null
      });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, policy);

      expect(adj.estimatedPatientShare).toBeGreaterThanOrEqual(0);
      expect(adj.estimatedInsurerShare).toBeGreaterThanOrEqual(0);
      expect(adj.reconciled).toBe(true);
    });
  });

  describe('Discovery Card Preview & Detailed Breakdown Synchronization', () => {
    it('should ensure hospital card patientPayable matches breakdown modal estimatedPatientShare', () => {
      const policy = createMockPolicy({
        sumInsured: 300000,
        copay: 10,
        deductible: 5000,
        roomLimit: { type: 'amount', value: 2000 },
        proportionateDeduction: true
      });

      const searchRes = hospitalService.search({
        policy,
        city: 'Bengaluru',
        specialty: 'Cardiology',
        procedure: 'Angioplasty',
        roomType: 'General Ward'
      });

      expect(searchRes.hospitals.length).toBeGreaterThan(0);
      const topHosp = searchRes.hospitals[0];

      const breakdown = hospitalService.getDetailedBillBreakdown(
        topHosp.hospital.hospital_name,
        topHosp.hospital.address,
        policy,
        'Cardiology',
        'Angioplasty',
        'General Ward'
      );

      expect(breakdown).not.toBeNull();
      if (breakdown) {
        // Strict synchronization: card out-of-pocket must match modal out-of-pocket
        expect(topHosp.score.patientPayable).toBe(breakdown.estimatedPatientShare);
        expect(topHosp.score.estimatedPatientShare).toBe(breakdown.estimatedPatientShare);
        expect(breakdown.reconciled).toBe(true);
        expect(breakdown.estimatedInsurerShare + breakdown.estimatedPatientShare).toBe(breakdown.itemizedBill.totalBill);
      }
    });
  });

  describe('Seeded Financial Benchmark & Traceable Reasoning (Section 11 & 12)', () => {
    it('should naturally calculate the exact competition blueprint benchmark without hardcoding', () => {
      // Benchmark specification:
      // Billed: ₹4,00,000
      // 5 days stay in ₹8,000/day room. Policy cap is ₹5,000/day.
      // Room excess: (8,000 - 5,000) * 5 = ₹15,000
      // Ratio: 5,000 / 8,000 = 0.625. Disallowance ratio = 0.375
      // Associate medical expenses: ₹1,90,000 -> Proportionate disallowance = 1,90,000 * 0.375 = ₹71,250
      // Allowed before disease sublimit: 4,00,000 - 15,000 - 71,250 = ₹3,13,750
      // Disease sublimit: ₹1,60,000
      // 20% co-pay on ₹1,60,000 = ₹32,000
      // Insurer Share: ₹1,28,000
      // Patient Share: ₹2,72,000

      const customPolicy = createMockPolicy({
        sumInsured: 500000,
        roomLimit: { type: 'amount', value: 5000 },
        proportionateDeduction: true,
        copay: 20,
        deductible: 0,
        subLimits: {
          'Cardiology': 160000
        }
      });

      // Synthetic estimate tailored to benchmark scenario
      const benchmarkEstimate: any = {
        available: true,
        treatmentCost: 158333, // 158333 + 20% doctor fees (31667) = 190,000 associate medical expenses
        roomCostPerDay: 8000,
        estimatedStayDays: 5,
        totalCost: 400000
      };

      // In hospitalService: doctorFees = treatmentCost * 0.20
      // So procedureCharges (158333) + doctorFees (31667) = 190,000 associate charges
      // With allowedRatio = 5000 / 8000 = 0.625, proportionateDisallowance = 190,000 * 0.375 = 71,250!
      // totalBill = 400,000
      // nonMedical = 0 if we mock or test through calculation
      const adj = hospitalService.calculatePolicyAdjudication(
        benchmarkEstimate,
        customPolicy,
        'Single Private Room',
        'Cardiology',
        'Cardiac Angioplasty'
      );

      // Verify each step in the deterministic chain
      expect(adj.totalRoomRentExcess).toBe(15000);
      expect(adj.proportionateDisallowance).toBe(71250);
      
      // If nonMedicalDeductible is active (~5%), verify the exact formula holds
      const allowedBeforeSublimit = adj.itemizedBill.totalBill - adj.totalRoomRentExcess - adj.proportionateDisallowance - adj.nonMedicalDeductible;
      expect(adj.allowedBeforeSublimit).toBe(allowedBeforeSublimit);

      // Verify sublimit cap is respected
      expect(adj.diseaseSublimit).toBe(160000);
      expect(adj.sublimitMatchedClause).toBe('Cardiology');

      // Verify co-pay is calculated on admissible amount after sublimit
      const expectedAdmissibleAfterSublimit = Math.min(allowedBeforeSublimit, 160000);
      const expectedCopay = Math.round(expectedAdmissibleAfterSublimit * 0.20);
      expect(adj.copayAmount).toBe(expectedCopay);

      // Verify final split reconciles 100%
      expect(adj.reconciled).toBe(true);
      expect(adj.estimatedInsurerShare + adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);

      // Verify Traceable Explanation steps are populated
      expect(adj.explanationSteps).toBeDefined();
      expect(adj.explanationSteps!.length).toBeGreaterThanOrEqual(6);
      expect(adj.explanationSteps![0]).toContain('Total billed');
    });
  });

  describe('Adversarial Edge Cases & Safety Gaps (Section 38)', () => {
    it('should fail safely when hospital has no cost estimates', () => {
      const dummyHospital: any = {
        hospital_name: 'Empty Clinic',
        hospital_type: 'Private',
        tier: 'Tier99',
        segment: 'Local',
        address: 'No Address',
        city: 'Bengaluru'
      };
      const est = hospitalService.calculateHospitalEstimate(dummyHospital, 'NonExistentSpecialty');
      expect(est.available).toBe(false);
      expect(est.totalCost).toBe(0);
    });

    it('should handle zero sum insured without division by zero', () => {
      const zeroSiPolicy = createMockPolicy({ sumInsured: 0 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, zeroSiPolicy);

      expect(adj.estimatedInsurerShare).toBe(0);
      expect(adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
      expect(adj.reconciled).toBe(true);
    });

    it('should handle 100% co-pay without negative insurer share', () => {
      const fullCopayPolicy = createMockPolicy({ copay: 100 });
      const hospital = hospitalService.hospitals[0];
      const est = hospitalService.calculateHospitalEstimate(hospital, 'Cardiology', 'Angioplasty');
      const adj = hospitalService.calculatePolicyAdjudication(est, fullCopayPolicy);

      expect(adj.estimatedInsurerShare).toBe(0);
      expect(adj.estimatedPatientShare).toBe(adj.itemizedBill.totalBill);
      expect(adj.reconciled).toBe(true);
    });
  });
});

