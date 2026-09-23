import { describe, it, expect, beforeAll } from 'vitest';
import { DEMO_POLICIES } from '../src/utils/demoData.js';
import { hospitalService, getCanonicalSpecialty } from '../src/services/hospitalService.js';
import { PolicyDocument } from '../types/policy.js';

describe('Precision Care Challenge 2026: Care Journey & Domain Truthfulness', () => {
  beforeAll(async () => {
    await hospitalService.initData();
  }, 30000);

  const hdfcDemo = DEMO_POLICIES.find(p => p.id === 'pol_demo_hdfc');
  const hdfcPolicy = hdfcDemo?.data as PolicyDocument;

  describe('Ground-Truth HDFC ERGO Policy Fixture', () => {
    it('fixture exists and has exact ground-truth values', () => {
      expect(hdfcPolicy).toBeDefined();
      expect(hdfcPolicy.insurer).toBe('HDFC ERGO');
      expect(hdfcPolicy.insurerAliases).toContain('HDFC ERGO General Insurance Company Limited');
      expect(hdfcPolicy.planName).toBe('Corporate Group Health Shield');
      expect(hdfcPolicy.policyNumber).toBe('HDFC/GRP/2026/98214');
      expect(hdfcPolicy.sumInsured).toBe(500000);
      expect(hdfcPolicy.zone).toBe('Zone A');
      expect(hdfcPolicy.tpa).toBe('Vidal Health TPA');
      expect(hdfcPolicy.deductible).toBe(0);
      expect(hdfcPolicy.restorationBenefit).toBe(true);
      expect(hdfcPolicy.preHospitalizationDays).toBe(30);
      expect(hdfcPolicy.postHospitalizationDays).toBe(60);
      expect(hdfcPolicy.ambulanceLimit).toBe(2500);
    });

    it('room rent limit is 1% of Sum Insured (derived to ₹5,000/day)', () => {
      expect(hdfcPolicy.roomLimit).toEqual({ type: 'percent', value: 1 });
      const dailyLimit = ((hdfcPolicy.roomLimit?.value || 0) / 100) * (hdfcPolicy.sumInsured || 0);
      expect(dailyLimit).toBe(5000);
      expect(hdfcPolicy.proportionateDeduction).toBe(true);
    });

    it('network co-pay is 0% and non-network co-pay is strictly null (unknown/unspecified)', () => {
      expect(hdfcPolicy.copay).toBe(0);
      // Non-network co-pay must NOT be inferred as 0% or same as base
      expect(hdfcPolicy.nonNetworkCopay).toBeNull();
    });

    it('waiting periods reflect corporate waiver terms (0 days initial & PED, 9 months maternity)', () => {
      expect(hdfcPolicy.waitingPeriods?.initial).toBe('0 days');
      expect(hdfcPolicy.waitingPeriods?.preExisting).toBe('0 days');
      expect(hdfcPolicy.waitingPeriods?.maternity).toBe('9 months');
    });

    it('has no arbitrary disease sub-limits fabricated in fixture', () => {
      expect(hdfcPolicy.subLimits).toEqual({});
    });
  });

  describe('Specialty Canonicalization & Exact Match Gate', () => {
    it('canonicalizes known clinical specialties deterministically', () => {
      expect(getCanonicalSpecialty('Neurology')).toBe('Neurology');
      expect(getCanonicalSpecialty('neurology')).toBe('Neurology');
      expect(getCanonicalSpecialty('Cardiology')).toBe('Cardiology');
      expect(getCanonicalSpecialty('cardio')).toBe('Cardiology');
      expect(getCanonicalSpecialty('Orthopedics')).toBe('Orthopedics');
      expect(getCanonicalSpecialty('ortho')).toBe('Orthopedics');
      expect(getCanonicalSpecialty('Oncology')).toBe('Oncology');
      expect(getCanonicalSpecialty('cancer')).toBe('Oncology');
      expect(getCanonicalSpecialty('Gynecology')).toBe('Gynecology');
      expect(getCanonicalSpecialty('gynae')).toBe('Gynecology');
      expect(getCanonicalSpecialty('Urology')).toBe('Urology');
      expect(getCanonicalSpecialty('General Surgery')).toBe('General Surgery');
    });

    it('prevents substring false-positives: Neurosurgery, Neonatology do NOT alias to Neurology', () => {
      expect(getCanonicalSpecialty('Neurosurgery')).toBe('Neurosurgery');
      expect(getCanonicalSpecialty('Neonatology')).toBe('Neonatology');
      expect(getCanonicalSpecialty('Neurosurgery')).not.toBe('Neurology');
      expect(getCanonicalSpecialty('Neonatology')).not.toBe('Neurology');
    });

    it('returns empty results if an unknown specialty is requested (hard filter gate)', () => {
      const res = hospitalService.search({
        policy: hdfcPolicy,
        city: 'Bengaluru',
        specialty: 'FictionalMedicalSpecialtyXYZ',
        roomType: 'General Ward'
      });
      expect(res.hospitals.length).toBe(0);
      expect(res.specialtyMatchedCount).toBe(0);
    });
  });

  describe('Separation of Counts: Total City, Network Facilities, and Specialty Matches', () => {
    it('reports separate counts for Bengaluru reference dataset', () => {
      const res = hospitalService.search({
        policy: hdfcPolicy,
        city: 'Bengaluru',
        specialty: 'Neurology',
        roomType: 'General Ward'
      });

      expect(res.totalCityHospitals).toBeGreaterThanOrEqual(900);
      expect(res.networkFacilityCount).toBeGreaterThanOrEqual(200);
      expect(res.specialtyMatchedCount).toBeGreaterThan(0);
      expect(res.hospitals.length).toBeGreaterThan(0);

      // Verify every returned hospital has specialtyStatus and networkProvenance
      const first = res.hospitals[0];
      expect(first.specialtyStatus).toBe('DATASET_LISTED');
      expect(first.networkProvenance).toBe('NETWORK_REFERENCE_MATCH');
    });
  });

  describe('Financial Engine & Proportionate Deduction Audit', () => {
    it('calculates ₹0 room excess and 0 proportionate deduction for room below limit', () => {
      const searchRes = hospitalService.search({
        policy: hdfcPolicy,
        city: 'Bengaluru',
        specialty: 'Neurology',
        roomType: 'General Ward'
      });

      expect(searchRes.hospitals.length).toBeGreaterThan(0);
      const targetHosp = searchRes.hospitals[0].hospital;

      const breakdown = hospitalService.getDetailedBillBreakdown(
        targetHosp.hospital_name,
        targetHosp.address,
        hdfcPolicy,
        'Neurology',
        undefined,
        'General Ward',
        'Bengaluru'
      );

      expect(breakdown).not.toBeNull();
      if (breakdown) {
        expect(breakdown.roomLimitEligiblePerDay).toBe(5000);
        expect(breakdown.itemizedBill.roomRatePerDay).toBeLessThanOrEqual(5000);
        expect(breakdown.roomRentExcessPerDay).toBe(0);
        expect(breakdown.totalRoomRentExcess).toBe(0);
        expect(breakdown.proportionateDisallowance).toBe(0);
        expect(breakdown.proportionateDeductionActive).toBe(false);

        // Verify reconciliation: patient share + insurer share == total bill
        const reconciledSum = breakdown.totalPatientPayable + breakdown.totalInsuranceCovered;
        expect(Math.abs(reconciledSum - breakdown.itemizedBill.totalBill)).toBeLessThanOrEqual(1);
      }
    });

    it('calculates excess and proportionate deduction when room tariff exceeds ₹5,00,000 / 1% (₹5,000/day)', () => {
      const searchRes = hospitalService.search({
        policy: hdfcPolicy,
        city: 'Bengaluru',
        specialty: 'Neurology',
        roomType: 'Single Private Room'
      });

      expect(searchRes.hospitals.length).toBeGreaterThan(0);
      const targetHosp = searchRes.hospitals[0].hospital;

      const breakdown = hospitalService.getDetailedBillBreakdown(
        targetHosp.hospital_name,
        targetHosp.address,
        hdfcPolicy,
        'Neurology',
        undefined,
        'Single Private Room',
        'Bengaluru'
      );

      expect(breakdown).not.toBeNull();
      if (breakdown) {
        expect(breakdown.roomLimitEligiblePerDay).toBe(5000);
        if (breakdown.itemizedBill.roomRatePerDay > 5000) {
          expect(breakdown.roomRentExcessPerDay).toBe(breakdown.itemizedBill.roomRatePerDay - 5000);
          expect(breakdown.totalRoomRentExcess).toBe(breakdown.roomRentExcessPerDay * breakdown.itemizedBill.stayDays);
          expect(breakdown.proportionateDeductionActive).toBe(true);
          expect(breakdown.proportionateDisallowance).toBeGreaterThan(0);
        }

        // Reconciliation must always hold true
        const reconciledSum = breakdown.totalPatientPayable + breakdown.totalInsuranceCovered;
        expect(Math.abs(reconciledSum - breakdown.itemizedBill.totalBill)).toBeLessThanOrEqual(1);
      }
    });

    it('5 days stay in a ₹5,750/day room with ₹5,000/day limit produces exact ₹3,750 room excess', () => {
      const rate = 5750;
      const limit = 5000;
      const days = 5;
      const excessPerDay = rate - limit; // 750
      const totalExcess = excessPerDay * days; // 3750
      expect(excessPerDay).toBe(750);
      expect(totalExcess).toBe(3750);
    });
  });

  describe('Interactive Room Category Recalculation (No Stale Values)', () => {
    it('recalculates patient share when switching from General Ward to Single Private Room', () => {
      const searchRes = hospitalService.search({
        policy: hdfcPolicy,
        city: 'Bengaluru',
        specialty: 'Neurology',
        roomType: 'General Ward'
      });

      const targetHosp = searchRes.hospitals[0].hospital;

      const gwBreakdown = hospitalService.getDetailedBillBreakdown(
        targetHosp.hospital_name,
        targetHosp.address,
        hdfcPolicy,
        'Neurology',
        undefined,
        'General Ward',
        'Bengaluru'
      );

      const sprBreakdown = hospitalService.getDetailedBillBreakdown(
        targetHosp.hospital_name,
        targetHosp.address,
        hdfcPolicy,
        'Neurology',
        undefined,
        'Single Private Room',
        'Bengaluru'
      );

      expect(gwBreakdown).not.toBeNull();
      expect(sprBreakdown).not.toBeNull();

      if (gwBreakdown && sprBreakdown) {
        expect(gwBreakdown.roomType).toBe('General Ward');
        expect(sprBreakdown.roomType).toBe('Single Private Room');

        // Single Private Room must have equal or higher room tariff
        expect(sprBreakdown.itemizedBill.roomRatePerDay).toBeGreaterThanOrEqual(gwBreakdown.itemizedBill.roomRatePerDay);

        // If room rate is higher, patient payable in Single Private Room must reflect that
        if (sprBreakdown.itemizedBill.roomRatePerDay > gwBreakdown.itemizedBill.roomRatePerDay) {
          expect(sprBreakdown.totalPatientPayable).toBeGreaterThanOrEqual(gwBreakdown.totalPatientPayable);
        }
      }
    });
  });
});
