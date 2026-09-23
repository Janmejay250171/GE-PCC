import { describe, it, expect, beforeAll } from 'vitest';
import { searchHospitals, getHospitalCostBreakdown } from '../src/controllers/hospitalController.js';
import { hospitalService } from '../src/services/hospitalService.js';

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.jsonData = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return res;
}

describe('Hospital Controller: Policy Enforcement & Demo Transparency (Priority 5)', () => {
  beforeAll(async () => {
    await hospitalService.initData();
  }, 30000);

  it('searchHospitals returns HTTP 400 when policy is omitted without explicit demo flag', async () => {
    const req: any = {
      body: {
        city: 'Bengaluru',
        specialty: 'Cardiology'
      },
      query: {}
    };
    const res = createMockRes();

    await searchHospitals(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error).toBeDefined();
    expect(res.jsonData.error.code).toBe('POLICY_REQUIRED');
    expect(res.jsonData.error.message).toContain('policyId or policy payload is required');
  });

  it('searchHospitals NEVER silently falls back to Star Health when policy is missing', async () => {
    const req: any = {
      body: {
        city: 'Bengaluru'
      },
      query: {}
    };
    const res = createMockRes();

    await searchHospitals(req, res);

    expect(res.statusCode).toBe(400);
    // Should NOT have returned hospital results with Star Health
    expect(res.jsonData.hospitals).toBeUndefined();
  });

  it('searchHospitals activates demo mode when explicitly requested via demo: true', async () => {
    const req: any = {
      body: {
        city: 'Bengaluru',
        demo: true
      },
      query: {}
    };
    const res = createMockRes();

    await searchHospitals(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.isDemoMode).toBe(true);
    expect(res.jsonData.demoNotice).toContain('Demonstration mode active');
    expect(res.jsonData.policy.insurer).toBe('Star Health');
    expect(res.jsonData.datasetMetadata).toBeDefined();
    expect(res.jsonData.datasetMetadata.datasetVersion).toBe('Static Prototype Reference Data');
  });

  it('searchHospitals uses the provided user policy without substituting demo values', async () => {
    const customInsurer = 'National Insurance Co';
    const req: any = {
      body: {
        city: 'Bengaluru',
        policy: {
          insurer: customInsurer,
          sumInsured: 750000,
          copay: 15,
          policyType: 'private'
        }
      },
      query: {}
    };
    const res = createMockRes();

    await searchHospitals(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.isDemoMode).toBe(false);
    expect(res.jsonData.policy.insurer).toBe(customInsurer);
    expect(res.jsonData.policy.sumInsured).toBe(750000);
    expect(res.jsonData.policy.copay).toBe(15);
  });

  it('getHospitalCostBreakdown returns HTTP 400 when hospitalName and hospitalId are missing', async () => {
    const req: any = {
      body: {
        demo: true
      },
      query: {}
    };
    const res = createMockRes();

    await getHospitalCostBreakdown(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error.code).toBe('PARAM_REQUIRED');
  });

  it('getHospitalCostBreakdown returns HTTP 400 when policy is missing without demo flag', async () => {
    const sampleHospital = hospitalService.hospitals[0];
    const req: any = {
      body: {
        hospitalName: sampleHospital.hospital_name,
        hospitalAddress: sampleHospital.address,
        city: sampleHospital.city
      },
      query: {}
    };
    const res = createMockRes();

    await getHospitalCostBreakdown(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error.code).toBe('POLICY_REQUIRED');
  });

  it('getHospitalCostBreakdown handles ambiguous hospital branch with HTTP 400 and AMBIGUOUS_HOSPITAL_BRANCH', async () => {
    // Find a hospital name present across multiple cities
    const nameCounts = new Map<string, Set<string>>();
    for (const h of hospitalService.hospitals) {
      const norm = h.hospital_name.trim().toLowerCase();
      if (!nameCounts.has(norm)) nameCounts.set(norm, new Set());
      nameCounts.get(norm)!.add(h.city);
    }

    let chainName = '';
    for (const [name, citySet] of nameCounts.entries()) {
      if (citySet.size >= 3) {
        chainName = name;
        break;
      }
    }

    const req: any = {
      body: {
        hospitalName: chainName,
        // no city, no address
        demo: true
      },
      query: {}
    };
    const res = createMockRes();

    await getHospitalCostBreakdown(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.jsonData.error.code).toBe('AMBIGUOUS_HOSPITAL_BRANCH');
    expect(res.jsonData.error.message).toContain('Ambiguous hospital branch');
  });

  it('getHospitalCostBreakdown succeeds when provided with hospital and valid policy', async () => {
    const sampleHospital = hospitalService.hospitals[0];
    const req: any = {
      body: {
        hospitalName: sampleHospital.hospital_name,
        hospitalAddress: sampleHospital.address,
        city: sampleHospital.city,
        hospitalId: sampleHospital.hospital_id,
        policy: {
          insurer: 'Care Health',
          sumInsured: 500000,
          copay: 0,
          policyType: 'private',
          roomLimit: { type: 'none', value: null }
        },
        specialty: 'Cardiology',
        procedure: 'Angioplasty'
      },
      query: {}
    };
    const res = createMockRes();

    await getHospitalCostBreakdown(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData.itemizedBill).toBeDefined();
    expect(res.jsonData.reconciled).toBe(true);
    expect(res.jsonData.datasetMetadata).toBeDefined();
  });
});
