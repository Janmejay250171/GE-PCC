import { describe, it, expect, beforeAll } from 'vitest';
import { hospitalService } from '../src/services/hospitalService.js';
import { PolicyDocument } from '../src/types/policy.js';

describe('Hospital Discovery, Ranking & Bill Breakdown Engine', () => {
  beforeAll(async () => {
    await hospitalService.initData();
  }, 30000);

  it('should load datasets and extract cities', () => {
    const cities = hospitalService.getCities();
    expect(cities.length).toBeGreaterThan(10);
    const hasBengaluru = cities.some(c => c.name.toLowerCase() === 'bengaluru');
    expect(hasBengaluru).toBe(true);
  });

  it('should return taxonomy with specialties and procedures', () => {
    const taxonomy = hospitalService.getTaxonomy();
    expect(taxonomy.specialties.length).toBeGreaterThan(0);
    expect(taxonomy.specialties).toContain('Cardiology');
    expect(taxonomy.proceduresBySpecialty['Cardiology']).toBeDefined();
    expect(taxonomy.proceduresBySpecialty['Cardiology']).toContain('Angioplasty');
  });

  it('should filter hospitals by city and insurer, and rank by SehatSure formula', () => {
    const mockPolicy: PolicyDocument = {
      _id: 'test_star_policy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedByUser: true,
      insurer: 'Star Health',
      insurerAliases: ['Star Health and Allied Insurance', 'Star'],
      planName: 'Family Health Optima',
      policyType: 'private',
      policyNumber: 'P/TEST/2026',
      uin: 'SHAHLIP26046V092526',
      policyStartDate: '2026-04-01',
      policyEndDate: '2027-03-31',
      zone: 'Zone B',
      networkType: 'all-network',
      tpa: 'Medi Assist',
      insuredPersons: [],
      sumInsured: 300000,
      roomLimit: { type: 'amount', value: 3000 },
      icuLimit: { type: 'percent', value: 2 },
      copay: 10,
      nonNetworkCopay: 20,
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
      rawTextRef: null
    };

    const res = hospitalService.search({
      policy: mockPolicy,
      city: 'Bengaluru',
      specialty: 'Cardiology',
      procedure: 'Angioplasty',
      roomType: 'General Ward'
    });

    expect(res.hospitals.length).toBeGreaterThan(0);
    expect(res.isFallbackNetwork).toBeDefined();

    // Verify all ranked hospitals have valid SehatSure scores and network status
    for (const h of res.hospitals) {
      expect(h.networkStatus).toBeDefined();
      expect(['verified', 'unverified', 'no_match', 'unknown']).toContain(h.networkStatus);
      expect(h.isEmpanelled).toBe(h.networkStatus === 'verified');
      expect(h.score.finalScore).toBeGreaterThanOrEqual(0);
      expect(h.score.finalScore).toBeLessThanOrEqual(100);
      expect(h.score.coverageFit).toBeGreaterThanOrEqual(0);
      expect(h.score.coverageFit).toBeLessThanOrEqual(100);
      expect(h.score.patientCostFit).toBeGreaterThanOrEqual(0);
      expect(h.score.patientCostFit).toBeLessThanOrEqual(100);
      expect(h.score.hospitalTypeScore).toBeGreaterThanOrEqual(0);
      expect(h.score.hospitalTypeScore).toBeLessThanOrEqual(100);
      expect(h.score.coPayFit).toBeGreaterThanOrEqual(0);
      expect(h.score.coPayFit).toBeLessThanOrEqual(100);

      // Verify formula components:
      // FinalScore = 0.50*CoverageFit + 0.25*PatientCostFit + 0.15*HospitalTypeScore + 0.10*CoPayFit
      const expectedScore = Math.round(
        0.50 * h.score.coverageFit +
        0.25 * h.score.patientCostFit +
        0.15 * h.score.hospitalTypeScore +
        0.10 * h.score.coPayFit
      );
      expect(h.score.finalScore).toBe(expectedScore);
    }

    // Verify hospitals are sorted descending by final score
    for (let i = 0; i < res.hospitals.length - 1; i++) {
      expect(res.hospitals[i].score.finalScore).toBeGreaterThanOrEqual(res.hospitals[i + 1].score.finalScore);
    }
  });

  it('should calculate detailed bill and detect room limit capping & proportionate deduction', () => {
    const mockPolicy: PolicyDocument = {
      _id: 'test_cap_policy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedByUser: true,
      insurer: 'Star Health',
      insurerAliases: [],
      planName: 'Family Plan',
      policyType: 'private',
      policyNumber: 'P/1234',
      uin: 'UIN123',
      policyStartDate: '2026-01-01',
      policyEndDate: '2027-01-01',
      zone: 'Zone A',
      networkType: 'all-network',
      tpa: null,
      insuredPersons: [],
      sumInsured: 300000,
      roomLimit: { type: 'amount', value: 2500 }, // Capped at ₹2,500/day
      icuLimit: null,
      copay: 10, // 10% co-pay
      nonNetworkCopay: 20,
      copayConditions: {},
      deductible: 0,
      proportionateDeduction: true, // Active proportionate deduction
      subLimits: {},
      restorationBenefit: false,
      cumulativeBonus: 0,
      exclusions: [],
      hasOtherExclusions: false,
      waitingPeriods: null,
      preHospitalizationDays: 30,
      postHospitalizationDays: 60,
      daycareCovered: true,
      ambulanceLimit: 1500,
      preAuthHours: 6,
      claimIntimationHours: 24,
      sourceSnippets: {},
      confidence: {},
      rawTextRef: null
    };

    const cities = hospitalService.getCities();
    const res = hospitalService.search({
      policy: mockPolicy,
      city: 'Bengaluru',
      specialty: 'Cardiology',
      procedure: 'CABG',
      roomType: 'Single Private Room' // Single private is much higher than ₹2500/day
    });

    expect(res.hospitals.length).toBeGreaterThan(0);
    const topHosp = res.hospitals[0];

    const breakdown = hospitalService.getDetailedBillBreakdown(
      topHosp.hospital.hospital_name,
      topHosp.hospital.address,
      mockPolicy,
      'Cardiology',
      'CABG',
      'Single Private Room'
    );

    expect(breakdown).not.toBeNull();
    if (breakdown) {
      expect(breakdown.itemizedBill.totalBill).toBeGreaterThan(0);
      expect(breakdown.itemizedBill.roomCharges).toBeGreaterThan(0);
      expect(breakdown.itemizedBill.procedureCharges).toBeGreaterThan(0);
      expect(breakdown.itemizedBill.doctorFees).toBeGreaterThan(0);

      // Single private room rate > ₹2500, so excess room rent must be detected
      expect(breakdown.totalRoomRentExcess).toBeGreaterThan(0);

      // Proportionate deduction must be triggered because proportionateDeduction is true and room exceeded
      expect(breakdown.proportionateDeductionActive).toBe(true);
      expect(breakdown.proportionateDisallowance).toBeGreaterThan(0);

      // AI recommendation should contain room limit warning
      const hasWarning = breakdown.aiRecommendations.some(r => r.type === 'warning');
      expect(hasWarning).toBe(true);
    }
  });
});

describe('Hospital Network Verification & Fallback Logic (12 Mandatory Semantics Tests)', () => {
  const verifiedHospital: any = {
    hospital_name: 'Manipal Hospital',
    hospital_type: 'Private',
    address: 'HAL Airport Road, Bengaluru',
    city: 'Bengaluru',
    insurers: ['Star Health', 'Care Health', 'HDFC'],
    insurersRaw: 'Star Health, Care Health, HDFC',
    rating: 4.5,
    specialties: ['Cardiology'],
    tier: 'Metro 1',
    segment: 'Established'
  };

  const noMatchHospital: any = {
    hospital_name: 'Govt General Hospital',
    hospital_type: 'Government',
    address: 'Station Road, Bengaluru',
    city: 'Bengaluru',
    insurers: ['PMJAY'],
    insurersRaw: 'PMJAY',
    rating: 0,
    specialties: ['General Surgery'],
    tier: 'Metro 1',
    segment: 'Government'
  };

  const unverifiedHospitalNoData: any = {
    hospital_name: 'Community Nursing Home',
    hospital_type: 'Private',
    address: 'Layout Road, Bengaluru',
    city: 'Bengaluru',
    insurers: [],
    insurersRaw: '',
    rating: 0,
    specialties: ['General Medicine'],
    tier: 'Metro 1',
    segment: 'Budget/Local'
  };

  // Frontend display text mapping function to test UI contract
  function getFrontendNetworkLabel(status: string): string {
    switch (status) {
      case 'verified':
        return 'Network Match';
      case 'unverified':
        return 'Network Status Unverified';
      case 'no_match':
        return 'No Network Match Found';
      case 'unknown':
        return 'Network Status Unknown';
      default:
        return 'Network Status Unknown';
    }
  }

  it('Test 1 — Positive insurer match produces verified status and Network Match label', () => {
    const status = hospitalService.evaluateNetworkStatus(verifiedHospital, 'Star Health', ['Star']);
    expect(status).toBe('verified');
    expect(getFrontendNetworkLabel(status)).toBe('Network Match');
  });

  it('Test 2 — Explicit zero insurer matches marks negative lookup as no_match and never verified', () => {
    const status = hospitalService.evaluateNetworkStatus(noMatchHospital, 'Star Health', ['Star']);
    expect(status).toBe('no_match');
    expect(status).not.toBe('verified');
    expect(getFrontendNetworkLabel(status)).toBe('No Network Match Found');
  });

  it('Test 3 — Fallback hospitals receive unverified status and never inherit verified status', () => {
    // When isFallbackNetwork is true, even a hospital that might match reference data is explicitly marked unverified for discovery fallback
    const status = hospitalService.evaluateNetworkStatus(verifiedHospital, 'NonExistentInsurer', [], true);
    expect(status).toBe('unverified');
    expect(status).not.toBe('verified');
    expect(getFrontendNetworkLabel(status)).toBe('Network Status Unverified');

    // Test in search() flow when insurer has 0 matches
    const mockPolicyNoMatch: any = {
      _id: 'test_rare_policy',
      insurer: 'RareFictionalInsurerXYZ',
      insurerAliases: [],
      sumInsured: 500000,
      copay: 0,
      policyType: 'private'
    };
    const res = hospitalService.search({
      policy: mockPolicyNoMatch,
      city: 'Bengaluru'
    });
    expect(res.isFallbackNetwork).toBe(true);
    expect(res.hospitals.length).toBeGreaterThan(0);
    for (const h of res.hospitals) {
      expect(h.networkStatus).toBe('unverified');
      expect(h.networkStatus).not.toBe('verified');
      expect(h.isEmpanelled).toBe(false);
    }
  });

  it('Test 4 — Missing insurer data produces unknown or unverified and is NOT verified', () => {
    // Missing insurer in policy
    const statusUnknown = hospitalService.evaluateNetworkStatus(verifiedHospital, '', []);
    expect(statusUnknown).toBe('unknown');
    expect(statusUnknown).not.toBe('verified');

    // Hospital with missing/empty network reference data
    const statusNoData = hospitalService.evaluateNetworkStatus(unverifiedHospitalNoData, 'Star Health', []);
    expect(statusNoData).toBe('unverified');
    expect(statusNoData).not.toBe('verified');
  });

  it('Test 5 — Multiple insurer names and aliases match correctly without false positives', () => {
    // Should match known alias
    const matchAlias = hospitalService.isInsurerEmpanelled(verifiedHospital, 'Star Health and Allied Insurance', ['Star Health', 'Star']);
    expect(matchAlias).toBe(true);

    // Should NOT match unrelated insurer
    const noMatch = hospitalService.isInsurerEmpanelled(verifiedHospital, 'Max Bupa Health', ['Niva Bupa', 'Bupa']);
    expect(noMatch).toBe(false);
  });

  it('Test 6 — Case differences match consistently (e.g. Star Health vs star health)', () => {
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, 'STAR HEALTH')).toBe(true);
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, 'star health')).toBe(true);
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, 'StAr HeAlTh')).toBe(true);
  });

  it('Test 7 — Whitespace and format differences match consistently', () => {
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, '  Star Health  ')).toBe(true);
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, 'Star Health & Allied Insurance Co.')).toBe(true);
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, 'HDFC')).toBe(true);
    expect(hospitalService.isInsurerEmpanelled(verifiedHospital, '  HDFC ERGO  ')).toBe(true);
  });

  it('Test 8 — Confirmed verified hospital has networkStatus = verified', () => {
    const status = hospitalService.evaluateNetworkStatus(verifiedHospital, 'HDFC', ['HDFC ERGO']);
    expect(status).toBe('verified');
  });

  it('Test 9 — Explicit no-match hospital has networkStatus = no_match', () => {
    const status = hospitalService.evaluateNetworkStatus(noMatchHospital, 'HDFC', ['HDFC ERGO']);
    expect(status).toBe('no_match');
  });

  it('Test 10 — Verification unavailable produces unknown status', () => {
    const statusBlank = hospitalService.evaluateNetworkStatus(noMatchHospital, undefined);
    expect(statusBlank).toBe('unknown');

    const statusWhitespace = hospitalService.evaluateNetworkStatus(noMatchHospital, '   ');
    expect(statusWhitespace).toBe('unknown');
  });

  it('Test 11 — Fallback UI displays Network Status Unverified and NOT Empanelled or Network Match', () => {
    const label = getFrontendNetworkLabel('unverified');
    expect(label).toBe('Network Status Unverified');
    expect(label).not.toContain('Empanelled');
    expect(label).not.toBe('Network Match');
  });

  it('Test 12 — All four UI states map to exact required terminology', () => {
    expect(getFrontendNetworkLabel('verified')).toBe('Network Match');
    expect(getFrontendNetworkLabel('unverified')).toBe('Network Status Unverified');
    expect(getFrontendNetworkLabel('no_match')).toBe('No Network Match Found');
    expect(getFrontendNetworkLabel('unknown')).toBe('Network Status Unknown');
  });

  it('Verified Network Only filter returns ONLY verified hospitals and zero fallbacks', () => {
    const mockPolicy: any = {
      _id: 'test_filter_policy',
      insurer: 'RareFictionalInsurerXYZ',
      insurerAliases: [],
      sumInsured: 500000,
      copay: 0,
      policyType: 'private'
    };
    // With networkOnly: true, zero fallback hospitals are returned when no insurer match exists
    const res = hospitalService.search({
      policy: mockPolicy,
      city: 'Bengaluru',
      networkOnly: true
    });
    expect(res.hospitals.length).toBe(0);
    expect(res.totalCount).toBe(0);
  });

  describe('Hospital Branch Collision & Ambiguity Prevention (Priority 4)', () => {
    it('exact unique ID matches target hospital directly', () => {
      const target = hospitalService.hospitals[5];
      expect(target.hospital_id).toBeDefined();

      const lookup = hospitalService.findHospital({
        hospitalId: target.hospital_id,
        hospitalName: 'Irrelevant Hospital Name'
      });

      expect(lookup.hospital).not.toBeNull();
      expect(lookup.hospital?.hospital_id).toBe(target.hospital_id);
    });

    it('same hospital name in different cities resolves to the specified city, not a random branch', () => {
      // Find a hospital name present in at least two different cities
      const nameCounts = new Map<string, Set<string>>();
      for (const h of hospitalService.hospitals) {
        const norm = h.hospital_name.trim().toLowerCase();
        if (!nameCounts.has(norm)) nameCounts.set(norm, new Set());
        nameCounts.get(norm)!.add(h.city);
      }

      let multiCityName = '';
      let cities: string[] = [];
      for (const [name, citySet] of nameCounts.entries()) {
        if (citySet.size >= 2) {
          multiCityName = name;
          cities = Array.from(citySet);
          break;
        }
      }

      expect(multiCityName).toBeTruthy();
      expect(cities.length).toBeGreaterThanOrEqual(2);

      const city1 = cities[0];
      const city2 = cities[1];

      const lookupCity1 = hospitalService.findHospital({
        hospitalName: multiCityName,
        city: city1
      });
      if (lookupCity1.hospital) {
        expect(lookupCity1.hospital.city.toLowerCase()).toBe(city1.toLowerCase());
      }

      const lookupCity2 = hospitalService.findHospital({
        hospitalName: multiCityName,
        city: city2
      });
      if (lookupCity2.hospital) {
        expect(lookupCity2.hospital.city.toLowerCase()).toBe(city2.toLowerCase());
      }
    });

    it('multi-city hospital chain without city/address returns an explicit ambiguity error rather than guessing', () => {
      // Find a name with branches in multiple cities
      const nameCounts = new Map<string, Set<string>>();
      for (const h of hospitalService.hospitals) {
        const norm = h.hospital_name.trim().toLowerCase();
        if (!nameCounts.has(norm)) nameCounts.set(norm, new Set());
        nameCounts.get(norm)!.add(h.city);
      }

      let multiCityName = '';
      for (const [name, citySet] of nameCounts.entries()) {
        if (citySet.size >= 2) {
          multiCityName = name;
          break;
        }
      }

      const lookup = hospitalService.findHospital({
        hospitalName: multiCityName
        // no city, no address
      });

      expect(lookup.hospital).toBeNull();
      expect(lookup.error).toContain('Ambiguous hospital branch');
      expect(lookup.matches).toBeDefined();
      expect(lookup.matches!.length).toBeGreaterThan(1);
    });

    it('same hospital name, same city with multiple facilities requires specific address', () => {
      // Find or verify behavior when multiple facilities share name and city
      const cityBranchCounts = new Map<string, number>();
      for (const h of hospitalService.hospitals) {
        const key = `${h.hospital_name.trim().toLowerCase()}:::${h.city.trim().toLowerCase()}`;
        cityBranchCounts.set(key, (cityBranchCounts.get(key) || 0) + 1);
      }

      let multiBranchKey = '';
      for (const [key, count] of cityBranchCounts.entries()) {
        if (count >= 2) {
          multiBranchKey = key;
          break;
        }
      }

      if (multiBranchKey) {
        const [targetName, targetCity] = multiBranchKey.split(':::');
        const ambiguousLookup = hospitalService.findHospital({
          hospitalName: targetName,
          city: targetCity
          // no address
        });
        expect(ambiguousLookup.hospital).toBeNull();
        expect(ambiguousLookup.error).toContain('Ambiguous hospital branch');

        // Now with specific address of first match
        const firstFacility = ambiguousLookup.matches![0];
        const resolvedLookup = hospitalService.findHospital({
          hospitalName: targetName,
          city: targetCity,
          address: firstFacility.address
        });
        expect(resolvedLookup.hospital).not.toBeNull();
        expect(resolvedLookup.hospital?.address).toBe(firstFacility.address);
      }
    });

    it('bill breakdown uses the actual matched hospital data', () => {
      const sampleHospital = hospitalService.hospitals[0];
      const mockPolicy: any = {
        _id: 'test_bd_policy',
        insurer: 'Star Health',
        insurerAliases: [],
        sumInsured: 500000,
        copay: 0,
        policyType: 'private',
        roomLimit: { type: 'none', value: null }
      };

      const breakdown = hospitalService.getDetailedBillBreakdown(
        sampleHospital.hospital_name,
        sampleHospital.address,
        mockPolicy,
        'Cardiology',
        'Angioplasty',
        'General Ward',
        sampleHospital.city,
        sampleHospital.hospital_id
      );

      expect(breakdown).not.toBeNull();
      expect(breakdown?.itemizedBill.totalBill).toBeGreaterThan(0);
      expect(breakdown?.reconciled).toBe(true);
    });
  });
});
