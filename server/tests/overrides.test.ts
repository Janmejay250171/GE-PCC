import { describe, it, expect } from 'vitest';
import { applySchemeOverrides, applyTier2Defaults } from '../src/services/overrideService.js';
import { PolicyDocument } from '../types/policy.js';

describe('Scheme Overrides and Tier 2 Defaults', () => {
  it('overrides a PM-JAY policy claiming a room limit to { type: "none" }, copay 0, sumInsured 500000', () => {
    const policy: Partial<PolicyDocument> = {
      policyType: 'pmjay',
      sumInsured: 100000,
      roomLimit: { type: 'amount', value: 2500 },
      icuLimit: { type: 'percent', value: 2 },
      copay: 20,
      nonNetworkCopay: 30,
      proportionateDeduction: true
    };

    applySchemeOverrides(policy);

    expect(policy.sumInsured).toBe(500000);
    expect(policy.roomLimit).toEqual({ type: 'none', value: null });
    expect(policy.icuLimit).toEqual({ type: 'none', value: null });
    expect(policy.copay).toBe(0);
    expect(policy.nonNetworkCopay).toBe(0);
    expect(policy.proportionateDeduction).toBe(false);
    expect(policy.networkType).toBe('restricted-network');

    expect(policy.confidence?.['sumInsured']).toBe('assumed');
    expect(policy.confidence?.['roomLimit']).toBe('assumed');
    expect(policy.confidence?.['copay']).toBe('assumed');
  });

  it('overrides an ESI policy to sumInsured null, roomLimit { type: "none" }, copay 0', () => {
    const policy: Partial<PolicyDocument> = {
      policyType: 'esi',
      sumInsured: 200000,
      roomLimit: { type: 'amount', value: 1500 },
      copay: 15
    };

    applySchemeOverrides(policy);

    expect(policy.sumInsured).toBeNull();
    expect(policy.roomLimit).toEqual({ type: 'none', value: null });
    expect(policy.copay).toBe(0);
    expect(policy.nonNetworkCopay).toBe(0);
    expect(policy.proportionateDeduction).toBe(false);
    expect(policy.networkType).toBe('restricted-network');
    expect(policy.confidence?.['sumInsured']).toBe('assumed');
  });

  it('applies Tier 2 defaults: missing nonNetworkCopay remains null (unknown) with confidence "assumed"', () => {
    const policy: Partial<PolicyDocument> = {
      copay: 15,
      nonNetworkCopay: null,
      icuLimit: null,
      subLimits: undefined,
      networkType: null,
      restorationBenefit: null,
      cumulativeBonus: null,
      hasOtherExclusions: null
    };

    applyTier2Defaults(policy);

    expect(policy.nonNetworkCopay).toBeNull();
    expect(policy.confidence?.['nonNetworkCopay']).toBe('assumed');
    expect(policy.sourceSnippets?.['nonNetworkCopay']).toContain('Not specified in policy document');

    expect(policy.icuLimit).toEqual({ type: 'none', value: null });
    expect(policy.confidence?.['icuLimit']).toBe('assumed');

    expect(policy.subLimits).toEqual({});
    expect(policy.confidence?.['subLimits']).toBe('assumed');

    expect(policy.networkType).toBe('all-network');
    expect(policy.confidence?.['networkType']).toBe('assumed');
    expect(policy.sourceSnippets?.['networkType']).toBe(
      'Not specified in document; system assumption requires confirmation with insurer.'
    );
    expect(policy.sourceSnippets?.['networkType']).not.toContain('Defaulted to all-network cashless access');

    expect(policy.restorationBenefit).toBe(false);
    expect(policy.confidence?.['restorationBenefit']).toBe('assumed');

    expect(policy.cumulativeBonus).toBe(0);
    expect(policy.confidence?.['cumulativeBonus']).toBe('assumed');

    expect(policy.hasOtherExclusions).toBe(false);
    expect(policy.confidence?.['hasOtherExclusions']).toBe('assumed');
  });

  it('regression: never stores a synthetic assumption as a document-derived cashless snippet', () => {
    const policy: Partial<PolicyDocument> = {};
    applyTier2Defaults(policy);

    expect(policy.sourceSnippets?.['networkType']).not.toMatch(/all-network cashless access/i);
    expect(policy.sourceSnippets?.['networkType']).toContain('system assumption');
  });
});
