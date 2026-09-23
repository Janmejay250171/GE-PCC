import { Request, Response } from 'express';
import { hospitalService } from '../services/hospitalService.js';
import { Policy } from '../models/Policy.js';
import { inMemoryPolicyStore } from '../services/inMemoryPolicyStore.js';
import { DEMO_POLICIES } from '../utils/demoData.js';
import { PolicyDocument } from '../types/policy.js';
import { RoomCategory } from '../types/hospital.js';

async function resolvePolicy(
  policyId?: string,
  fallbackPolicy?: Partial<PolicyDocument>,
  isExplicitDemo?: boolean
): Promise<{ policy: PolicyDocument; isDemoMode: boolean } | null> {
  if (policyId) {
    // Check if it's a demo policy key or id
    const demo = DEMO_POLICIES.find(d => d.id === policyId || d.key === policyId);
    if (demo) {
      return {
        policy: {
          _id: demo.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confirmedByUser: true,
          ...demo.data
        } as PolicyDocument,
        isDemoMode: true
      };
    }

    try {
      const doc = await Policy.findById(policyId);
      if (doc) {
        return {
          policy: doc.toJSON() as PolicyDocument,
          isDemoMode: false
        };
      }
    } catch {
      // MongoDB query failed or not an ObjectId, fallback below
    }

    const inMem = inMemoryPolicyStore.get(policyId);
    if (inMem) {
      return {
        policy: inMem as PolicyDocument,
        isDemoMode: false
      };
    }
  }

  if (fallbackPolicy && (fallbackPolicy.insurer || fallbackPolicy.sumInsured !== undefined)) {
    return {
      policy: {
        _id: fallbackPolicy._id || 'temp_session_policy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByUser: Boolean(fallbackPolicy.confirmedByUser),
        insurer: fallbackPolicy.insurer !== undefined ? fallbackPolicy.insurer : '',
        insurerAliases: fallbackPolicy.insurerAliases || [],
        planName: fallbackPolicy.planName || 'Comprehensive Health Plan',
        policyType: fallbackPolicy.policyType || 'private',
        sumInsured: fallbackPolicy.sumInsured ?? 500000,
        roomLimit: fallbackPolicy.roomLimit || { type: 'amount', value: 3000 },
        rawTextRef: null,
        ...fallbackPolicy
      } as PolicyDocument,
      isDemoMode: false
    };
  }

  // Explicit demo mode only when specifically requested
  if (isExplicitDemo) {
    return {
      policy: {
        _id: 'explicit_demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByUser: true,
        insurer: 'Star Health',
        insurerAliases: ['Star Health and Allied Insurance', 'Star'],
        planName: 'Family Health Optima (Demo Sample)',
        policyType: 'private',
        sumInsured: 300000,
        roomLimit: { type: 'amount', value: 3000 },
        copay: 10,
        proportionateDeduction: true,
        policyNumber: 'P/DEMO/2026',
        uin: 'SHAHLIP26046V092526',
        policyStartDate: '2026-04-01',
        policyEndDate: '2027-03-31',
        zone: 'Zone B',
        networkType: 'all-network',
        tpa: 'Medi Assist',
        insuredPersons: [],
        icuLimit: { type: 'percent', value: 2 },
        nonNetworkCopay: 20,
        copayConditions: {},
        deductible: 0,
        subLimits: {},
        restorationBenefit: true,
        cumulativeBonus: 15000,
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
      },
      isDemoMode: true
    };
  }

  // Production/API behavior: No policy supplied and no demo mode requested -> return null
  return null;
}

export async function getCities(_req: Request, res: Response): Promise<void> {
  try {
    const cities = hospitalService.getCities();
    res.json({ cities: cities.slice(0, 100) });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to fetch cities.' } });
  }
}

export async function getTaxonomy(_req: Request, res: Response): Promise<void> {
  try {
    const taxonomy = hospitalService.getTaxonomy();
    res.json(taxonomy);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to fetch clinical taxonomy.' } });
  }
}

export async function searchHospitals(req: Request, res: Response): Promise<void> {
  try {
    const { policyId, policy: reqPolicy, city, specialty, procedure, roomType, networkOnly, demo } = req.body;
    const isExplicitDemo = Boolean(demo || req.query.demo === 'true');
    const policyResult = await resolvePolicy(policyId, reqPolicy, isExplicitDemo);

    if (!policyResult) {
      res.status(400).json({
        error: {
          code: 'POLICY_REQUIRED',
          message: 'A valid policyId or policy payload is required. For demonstration mode, explicitly pass demo: true.'
        }
      });
      return;
    }

    const { policy, isDemoMode } = policyResult;

    const result = hospitalService.search({
      policy,
      city: city || 'Bengaluru',
      specialty,
      procedure,
      roomType: (roomType as RoomCategory) || 'General Ward',
      networkOnly: Boolean(networkOnly)
    });

    res.json({
      policy: {
        id: policy._id,
        insurer: policy.insurer,
        sumInsured: policy.sumInsured,
        copay: policy.copay,
        roomLimit: policy.roomLimit,
        proportionateDeduction: policy.proportionateDeduction
      },
      isDemoMode,
      ...(isDemoMode ? { demoNotice: 'Demonstration mode active with sample policy data.' } : {}),
      datasetMetadata: hospitalService.getDatasetMetadata(),
      city: city || 'Bengaluru',
      specialty: specialty || null,
      procedure: procedure || null,
      roomType: roomType || 'General Ward',
      totalCount: result.totalCount,
      totalCityHospitals: result.totalCityHospitals,
      networkFacilityCount: result.networkFacilityCount,
      specialtyMatchedCount: result.specialtyMatchedCount,
      procedureMatchedCount: result.procedureMatchedCount,
      cityAverageCost: result.cityAverageCost,
      isFallbackNetwork: result.isFallbackNetwork,
      hospitals: result.hospitals
    });
  } catch (err: any) {
    console.error('[Search Hospitals Error]:', err);
    res.status(500).json({ error: { message: err.message || 'Failed to search hospitals.' } });
  }
}

export async function getHospitalCostBreakdown(req: Request, res: Response): Promise<void> {
  try {
    const {
      policyId,
      policy: reqPolicy,
      hospitalName,
      hospitalAddress,
      city,
      hospitalId,
      specialty,
      procedure,
      roomType = 'General Ward',
      demo,
      customBillAmount,
      expectedBill
    } = req.body;

    const parsedBillAmount = Number(customBillAmount || expectedBill) || undefined;

    if (!hospitalName && !hospitalId) {
      res.status(400).json({ error: { code: 'PARAM_REQUIRED', message: 'hospitalName or hospitalId is required.' } });
      return;
    }

    const isExplicitDemo = Boolean(demo || req.query.demo === 'true');
    const policyResult = await resolvePolicy(policyId, reqPolicy, isExplicitDemo);

    if (!policyResult) {
      res.status(400).json({
        error: {
          code: 'POLICY_REQUIRED',
          message: 'A valid policyId or policy payload is required. For demonstration mode, explicitly pass demo: true.'
        }
      });
      return;
    }

    const { policy, isDemoMode } = policyResult;

    const breakdown = hospitalService.getDetailedBillBreakdown(
      hospitalName || '',
      hospitalAddress || '',
      policy,
      specialty,
      procedure,
      roomType as RoomCategory,
      city,
      hospitalId,
      parsedBillAmount
    );

    if (!breakdown) {
      const lookup = hospitalService.findHospital({
        hospitalId,
        hospitalName: hospitalName || '',
        city,
        address: hospitalAddress
      });

      if (lookup.error) {
        res.status(400).json({
          error: {
            code: 'AMBIGUOUS_HOSPITAL_BRANCH',
            message: lookup.error
          }
        });
        return;
      }

      res.status(404).json({ error: { code: 'ESTIMATE_UNAVAILABLE', message: 'Hospital estimate not available in reference dataset.' } });
      return;
    }

    res.json({
      hospitalName: hospitalName || '',
      roomType,
      policy: {
        insurer: policy.insurer,
        sumInsured: policy.sumInsured,
        copay: policy.copay,
        roomLimit: policy.roomLimit,
        proportionateDeduction: policy.proportionateDeduction
      },
      isDemoMode,
      ...(isDemoMode ? { demoNotice: 'Demonstration mode active with sample policy data.' } : {}),
      datasetMetadata: hospitalService.getDatasetMetadata(),
      ...breakdown
    });
  } catch (err: any) {
    console.error('[Hospital Breakdown Error]:', err);
    res.status(500).json({ error: { message: err.message || 'Failed to generate bill breakdown.' } });
  }
}
