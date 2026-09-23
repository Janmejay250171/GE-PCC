import {
  HospitalSearchParams,
  HospitalSearchResponse,
  PolicyImpactBreakdown,
  RoomCategory
} from '../types/hospital';

export async function fetchCities(): Promise<{ name: string; count: number }[]> {
  const res = await fetch('/api/hospitals/cities');
  if (!res.ok) {
    throw new Error('Failed to load cities list.');
  }
  const data = await res.json();
  return data.cities || [];
}

export async function fetchTaxonomy(): Promise<{
  specialties: string[];
  proceduresBySpecialty: Record<string, string[]>;
}> {
  const res = await fetch('/api/hospitals/taxonomy');
  if (!res.ok) {
    throw new Error('Failed to load clinical taxonomy.');
  }
  return res.json();
}

export async function searchHospitals(params: HospitalSearchParams): Promise<HospitalSearchResponse> {
  const res = await fetch('/api/hospitals/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to search hospitals.');
  }
  return res.json();
}

export async function fetchHospitalBreakdown(params: {
  policyId?: string;
  policy?: any;
  hospitalName: string;
  hospitalAddress: string;
  city?: string;
  hospitalId?: string;
  specialty?: string;
  procedure?: string;
  roomType?: RoomCategory;
  demo?: boolean;
  customBillAmount?: number;
  expectedBill?: number;
}): Promise<PolicyImpactBreakdown> {
  const res = await fetch('/api/hospitals/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to calculate bill breakdown.');
  }
  return res.json();
}
