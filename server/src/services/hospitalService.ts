import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  HospitalRecord,
  CostRecord,
  HospitalEstimate,
  RankedHospitalItem,
  ScoreBreakdown,
  ItemizedBill,
  PolicyImpactBreakdown,
  RoomCategory,
  NetworkStatus,
  HospitalSearchResponse
} from '../types/hospital.js';
import { PolicyDocument } from '../types/policy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to CSV datasets (check root first, then cost/)
const possibleHospPaths = [
  path.resolve(__dirname, '../../../hospitals.csv'),
  path.resolve(__dirname, '../../hospitals.csv'),
  path.resolve(__dirname, '../../../cost/hospitals.csv')
];
const possiblePvtPaths = [
  path.resolve(__dirname, '../../../pvt_costs.csv'),
  path.resolve(__dirname, '../../pvt_costs.csv'),
  path.resolve(__dirname, '../../../cost/pvt_costs.csv')
];
const possibleGovtPaths = [
  path.resolve(__dirname, '../../../govt_costs.csv'),
  path.resolve(__dirname, '../../govt_costs.csv'),
  path.resolve(__dirname, '../../../cost/govt_costs.csv')
];

function resolveFilePath(paths: string[]): string {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

export const ESTIMATION_ASSUMPTIONS = {
  doctorFeeShare: 0.20,         // PROTOTYPE ASSUMPTION: 20% of procedure cost allocated to doctor/specialist fees
  medicineLabShare: 0.10,       // PROTOTYPE ASSUMPTION: 10% of procedure cost allocated to diagnostics & pharmacy
  nonMedicalShare: 0.05,        // PROTOTYPE ASSUMPTION: 5% modeled for typically non-admissible consumables (gloves, administrative kits)
  defaultSumInsured: 500000,    // SYSTEM-ASSUMED: Fallback sum insured if omitted from policy schedule
  defaultCopay: 0,              // SYSTEM-ASSUMED: Fallback co-pay percentage if omitted
  defaultDeductible: 0,         // SYSTEM-ASSUMED: Fallback compulsory deductible if omitted
  minStayDays: 1,               // PROTOTYPE ASSUMPTION: Minimum billable stay of 1 day for inpatient admissions
  hospitalVariationSpread: 0.10,// PROTOTYPE ASSUMPTION: Bounded attribute spread (+/- 5%)
  hospitalVariationOffset: -0.05
};

export const DATASET_METADATA = {
  datasetVersion: 'Static Prototype Reference Data',
  referenceDate: 'Not specified by source dataset',
  provenance: 'Static prototype reference data (indicative benchmarking, not live hospital quotations)',
  disclaimer: 'Hospital tariffs and procedure estimates are modeled from static prototype reference data (source date not specified). They do not represent live hospital quotations or real-time billing.'
};

const SEGMENT_POSITION: Record<string, number> = {
  'budget/local': 0.25,
  'budget': 0.25,
  'standard private': 0.40,
  'standard': 0.40,
  'established': 0.50,
  'premium': 0.65,
  'luxury': 0.80,
  'government': 0.50
};

type RoomCostKey = 'general_ward_cost_per_day' | 'twin_sharing_cost_per_day' | 'single_private_room_cost_per_day';

const ROOM_KEYS: Record<RoomCategory, RoomCostKey> = {
  'General Ward': 'general_ward_cost_per_day',
  'Twin Sharing': 'twin_sharing_cost_per_day',
  'Single Private Room': 'single_private_room_cost_per_day'
};

export const CANONICAL_SPECIALTIES: Record<string, string> = {
  'neurology': 'Neurology',
  'neuro': 'Neurology',
  'cardiology': 'Cardiology',
  'cardio': 'Cardiology',
  'orthopedics': 'Orthopedics',
  'ortho': 'Orthopedics',
  'orthopaedics': 'Orthopedics',
  'oncology': 'Oncology',
  'cancer': 'Oncology',
  'gynecology': 'Gynecology',
  'gynaecology': 'Gynecology',
  'gynae': 'Gynecology',
  'pediatrics': 'Pediatrics',
  'paediatrics': 'Pediatrics',
  'urology': 'Urology',
  'general surgery': 'General Surgery'
};

export function getCanonicalSpecialty(spec: string): string {
  if (!spec) return '';
  const norm = normalize(spec);
  return CANONICAL_SPECIALTIES[norm] || toTitleCase(norm);
}

const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'andaman and nicobar islands', 'chandigarh', 'dadra and nagar haveli and daman and diu',
  'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep', 'puducherry',
  'daman and diu', 'dadra and nagar haveli', 'uttaranchal', 'orissa', 'pondicherry', 'nct of delhi'
]);

export const CITY_CANONICAL_TIERS: Record<string, string> = {
  // Metro 1
  'bengaluru': 'Metro 1',
  'bangalore': 'Metro 1',
  'mumbai': 'Metro 1',
  'bombay': 'Metro 1',
  'navi mumbai': 'Metro 1',
  'thane': 'Metro 1',
  'delhi': 'Metro 1',
  'new delhi': 'Metro 1',
  'noida': 'Metro 1',
  'greater noida': 'Metro 1',
  'gurgaon': 'Metro 1',
  'gurugram': 'Metro 1',
  'faridabad': 'Metro 1',
  'ghaziabad': 'Metro 1',
  'hyderabad': 'Metro 1',
  'secunderabad': 'Metro 1',
  'chennai': 'Metro 1',
  'madras': 'Metro 1',
  'kolkata': 'Metro 1',
  'calcutta': 'Metro 1',
  'howrah': 'Metro 1',

  // Metro 2
  'pune': 'Metro 2',
  'ahmedabad': 'Metro 2',
  'gandhinagar': 'Metro 2',

  // Large City 1
  'jaipur': 'Large City 1',
  'surat': 'Large City 1',
  'lucknow': 'Large City 1',
  'kanpur': 'Large City 1',
  'nagpur': 'Large City 1',
  'indore': 'Large City 1',
  'bhopal': 'Large City 1',
  'patna': 'Large City 1',
  'vadodara': 'Large City 1',
  'coimbatore': 'Large City 1',

  // Large City 2
  'visakhapatnam': 'Large City 2',
  'vizag': 'Large City 2',
  'agra': 'Large City 2',
  'varanasi': 'Large City 2',
  'ludhiana': 'Large City 2',
  'nashik': 'Large City 2',
  'rajkot': 'Large City 2',
  'madurai': 'Large City 2',
  'meerut': 'Large City 2',
  'jabalpur': 'Large City 2',
  'gwalior': 'Large City 2',
  'chandigarh': 'Large City 2',
  'mohali': 'Large City 2',
  'panchkula': 'Large City 2',

  // City 1
  'amritsar': 'City 1',
  'allahabad': 'City 1',
  'prayagraj': 'City 1',
  'ranchi': 'City 1',
  'jodhpur': 'City 1',
  'raipur': 'City 1',
  'kota': 'City 1',
  'guwahati': 'City 1',
  'mysore': 'City 1',
  'mysuru': 'City 1',
  'hubli': 'City 1',
  'hubballi': 'City 1',
  'mangalore': 'City 1',
  'mangaluru': 'City 1',
  'belgaum': 'City 1',
  'belagavi': 'City 1',
  'salem': 'City 1',
  'tiruchirappalli': 'City 1',
  'trichy': 'City 1',
  'bareilly': 'City 1',
  'aligarh': 'City 1',
  'moradabad': 'City 1',
  'jalandhar': 'City 1',
  'bhubaneswar': 'City 1',
  'warangal': 'City 1',
  'guntur': 'City 1',
  'vijayawada': 'City 1',
  'tirupati': 'City 1',
  'dehradun': 'City 1',
  'kochi': 'City 1',
  'cochin': 'City 1',
  'thiruvananthapuram': 'City 1',
  'trivandrum': 'City 1',
  'calicut': 'City 1',
  'kozhikode': 'City 1',
  'gorakhpur': 'City 1',
  'saharanpur': 'City 1',
  'firozabad': 'City 1',
  'jhansi': 'City 1',
  'muzaffarnagar': 'City 1',
  'mathura': 'City 1',
  'kollam': 'City 1',
  'thrissur': 'City 1',
  'kannur': 'City 1',
  'dhanbad': 'City 1',
  'jamshedpur': 'City 1',
  'bokaro': 'City 1',
  'udaipur': 'City 1',
  'ajmer': 'City 1',
  'bikaner': 'City 1',
  'amravati': 'City 1',
  'solapur': 'City 1',
  'kolhapur': 'City 1',
  'aurangabad': 'City 1',
  'kurnool': 'City 1',
  'nellore': 'City 1',
  'rajahmundry': 'City 1',
  'kakinada': 'City 1',
  'karimnagar': 'City 1',
  'nizamabad': 'City 1',
  'tirunelveli': 'City 1',
  'erode': 'City 1',
  'vellore': 'City 1',
  'tuticorin': 'City 1',
  'thoothukudi': 'City 1',
  'siliguri': 'City 1',
  'rourkela': 'City 1',
  'haridwar': 'City 1',
  'roorkee': 'City 1',
  'haldwani': 'City 1',
  'jammu': 'City 1',
  'srinagar': 'City 1'
};

function normalize(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function cleanCandidateCity(s: string): string {
  if (!s) return '';
  let str = s.trim();

  // Strip pincodes
  str = str.replace(/\bpin(?:\s*code)?\s*[-:]?\s*\d+/gi, '')
           .replace(/\b\d{6}\b/g, '')
           .replace(/\b\d+\b/g, '')
           .trim();

  // Strip leading & trailing punctuation
  str = str.replace(/^[\s,.\-:/()]+|[\s,.\-:/()]+$/g, '').trim();

  const roadKeywords = [
    'bye\\s*pass\\s*road', 'bypass\\s*road', 'bye\\s*pass', 'bypass',
    'national\\s*highway', 'ring\\s*road', 'main\\s*road',
    'road', 'rd\\b', 'street', 'st\\b', 'marg', 'lane', 'highway', 'hwy',
    'talab', 'chowk', 'chowka', 'circle', 'complex'
  ];

  for (const kw of roadKeywords) {
    const re = new RegExp(`\\b${kw}\\b(.*)$`, 'i');
    const match = str.match(re);
    if (match && match[1]) {
      const rest = match[1].replace(/^[,\s\-/()]+/, '').trim();
      if (rest.length >= 2) {
        str = rest;
      }
    }
  }

  str = str.replace(/^[\s,.\-:/()]+|[\s,.\-:/()]+$/g, '').trim();
  return str;
}

function extractCity(address: string): string {
  if (!address) return 'Unknown';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'Unknown';

  const meaningful = parts.filter(p => !/^\d{6}$/.test(p) && !/^pin(?:\s*code)?\s*[-:]?\s*\d+$/i.test(p));
  if (meaningful.length === 0) return 'Unknown';

  for (let i = meaningful.length - 1; i >= 0; i--) {
    const candidate = meaningful[i];
    const cleaned = cleanCandidateCity(candidate);
    const norm = normalize(cleaned);
    if (!norm) continue;

    if (INDIAN_STATES.has(norm)) {
      if (i > 0) {
        const prevCleaned = cleanCandidateCity(meaningful[i - 1]);
        if (prevCleaned && !INDIAN_STATES.has(normalize(prevCleaned))) {
          return prevCleaned;
        }
      }
      continue;
    }
    return cleaned;
  }

  return cleanCandidateCity(meaningful[0]) || 'Unknown';
}

function normalizeCity(rawCity: string): string {
  let c = cleanCandidateCity(rawCity);
  if (!c || c.length < 2) return 'Other';

  const n = normalize(c);
  const cityAliases: Record<string, string> = {
    'bangalore': 'Bengaluru',
    'bengaluru': 'Bengaluru',
    'bombay': 'Mumbai',
    'mumbai': 'Mumbai',
    'calcutta': 'Kolkata',
    'kolkata': 'Kolkata',
    'madras': 'Chennai',
    'chennai': 'Chennai',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'gurgaon': 'Gurugram',
    'gurugram': 'Gurugram',
    'hyderabad': 'Hyderabad',
    'secunderabad': 'Hyderabad',
    'pune': 'Pune',
    'ahmedabad': 'Ahmedabad',
    'jaipur': 'Jaipur',
    'lucknow': 'Lucknow',
    'chandigarh': 'Chandigarh',
    'coimbatore': 'Coimbatore',
    'kochi': 'Kochi',
    'cochin': 'Kochi',
    'indore': 'Indore',
    'nagpur': 'Nagpur',
    'patna': 'Patna',
    'bhopal': 'Bhopal',
    'vadodara': 'Vadodara',
    'ludhiana': 'Ludhiana',
    'agra': 'Agra',
    'nashik': 'Nashik',
    'varanasi': 'Varanasi',
    'visakhapatnam': 'Visakhapatnam',
    'vizag': 'Visakhapatnam',
    'jammu': 'Jammu',
    'srinagar': 'Srinagar'
  };

  if (cityAliases[n]) return cityAliases[n];
  return toTitleCase(c);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getHospitalVariation(hospital: HospitalRecord): number {
  const seed = hashString([hospital.hospital_name, hospital.address, hospital.tier, hospital.segment].join('|'));
  const norm = (seed % 1000) / 1000; // 0.0 to 0.999
  return (norm * ESTIMATION_ASSUMPTIONS.hospitalVariationSpread) + ESTIMATION_ASSUMPTIONS.hospitalVariationOffset; // -0.05 to +0.05 (-5% to +5% deterministic prototype variation)
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

export class HospitalService {
  private hospitals: HospitalRecord[] = [];
  private pvtCosts: CostRecord[] = [];
  private govtCosts: CostRecord[] = [];

  private hospitalsByCity = new Map<string, HospitalRecord[]>();
  private allCities: { name: string; count: number }[] = [];
  private allSpecialties: string[] = [];
  private specialtyToProcedures = new Map<string, string[]>();

  private costRecordsMap = new Map<string, CostRecord>();
  private tierSpecialtyMap = new Map<string, CostRecord[]>();
  private tierMap = new Map<string, CostRecord[]>();

  private isLoaded = false;

  public async initData(): Promise<void> {
    if (this.isLoaded) return;

    const hospPath = resolveFilePath(possibleHospPaths);
    const pvtPath = resolveFilePath(possiblePvtPaths);
    const govtPath = resolveFilePath(possibleGovtPaths);

    console.log(`[HospitalService] Loading datasets from:`);
    console.log(` - Hospitals: ${hospPath}`);
    console.log(` - Pvt Costs: ${pvtPath}`);
    console.log(` - Govt Costs: ${govtPath}`);

    const hospRaw = fs.readFileSync(hospPath, 'utf8');
    const pvtRaw = fs.readFileSync(pvtPath, 'utf8');
    const govtRaw = fs.readFileSync(govtPath, 'utf8');

    this.parseHospitals(hospRaw);
    this.parseCosts(pvtRaw, 'private');
    this.parseCosts(govtRaw, 'government');

    this.buildIndexes();
    this.isLoaded = true;
    console.log(`[HospitalService] Successfully indexed ${this.hospitals.length} hospitals across ${this.allCities.length} cities.`);
  }

  private parseHospitals(csvText: string) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return;

    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const records: HospitalRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = cols[j] !== undefined ? cols[j].trim() : '';
      }

      const extractedCity = extractCity(obj.address);
      const city = normalizeCity(extractedCity);

      let ratingVal = parseFloat(obj.rating);
      if (isNaN(ratingVal) || ratingVal <= 0) {
        ratingVal = 0;
      }

      const specialties = (obj.specialties || '')
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);

      const insurersList = (obj.insurers || '')
        .split(',')
        .map(ins => ins.trim())
        .filter(Boolean);

      const canonicalTier = CITY_CANONICAL_TIERS[normalize(city)] || obj.tier || 'City 1';

      records.push({
        hospital_id: obj.hospital_id || obj.id || `hosp_${i}`,
        hospital_name: obj.hospital_name || 'Unnamed Hospital',
        hospital_type: obj.hospital_type || 'Private',
        address: obj.address || '',
        city,
        insurers: insurersList,
        insurersRaw: obj.insurers || '',
        rating: ratingVal,
        specialties,
        tier: canonicalTier,
        segment: obj.segment || 'Standard Private'
      });
    }

    this.hospitals = records;
  }

  private parseCosts(csvText: string, type: 'private' | 'government') {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return;

    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const records: CostRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const obj: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = cols[j] !== undefined ? cols[j].trim() : '';
      }

      records.push({
        tier: obj.tier || '',
        specialty: obj.specialty || '',
        procedure: obj.procedure || '',
        low_cost: parseFloat(obj.low_cost) || 0,
        highest_cost: parseFloat(obj.highest_cost) || 0,
        mean_cost: parseFloat(obj.mean_cost) || 0,
        estimated_stay_days: parseFloat(obj.estimated_stay_days) || 0,
        general_ward_cost_per_day: parseFloat(obj.general_ward_cost_per_day) || 0,
        twin_sharing_cost_per_day: parseFloat(obj.twin_sharing_cost_per_day) || 0,
        single_private_room_cost_per_day: parseFloat(obj.single_private_room_cost_per_day) || 0
      });
    }

    if (type === 'private') {
      this.pvtCosts = records;
    } else {
      this.govtCosts = records;
    }
  }

  private buildIndexes() {
    this.hospitalsByCity.clear();
    this.costRecordsMap.clear();
    this.tierSpecialtyMap.clear();
    this.tierMap.clear();
    this.specialtyToProcedures.clear();

    const cityCounts = new Map<string, number>();
    for (const h of this.hospitals) {
      const normCity = normalize(h.city);
      if (!this.hospitalsByCity.has(normCity)) {
        this.hospitalsByCity.set(normCity, []);
      }
      this.hospitalsByCity.get(normCity)!.push(h);

      const count = (cityCounts.get(h.city) || 0) + 1;
      cityCounts.set(h.city, count);
    }

    this.allCities = Array.from(cityCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const datasets = [
      { type: 'private', records: this.pvtCosts },
      { type: 'government', records: this.govtCosts }
    ];

    const specSet = new Set<string>();
    const specProcMap = new Map<string, Set<string>>();

    for (const ds of datasets) {
      for (const r of ds.records) {
        const normTier = normalize(r.tier);
        const normSpec = normalize(r.specialty);
        const normProc = normalize(r.procedure);

        if (r.specialty) {
          specSet.add(r.specialty);
          if (!specProcMap.has(r.specialty)) {
            specProcMap.set(r.specialty, new Set());
          }
          if (r.procedure) {
            specProcMap.get(r.specialty)!.add(r.procedure);
          }
        }

        const exactKey = `${ds.type}|${normTier}|${normSpec}|${normProc}`;
        this.costRecordsMap.set(exactKey, r);

        const specKey = `${ds.type}|${normTier}|${normSpec}`;
        if (!this.tierSpecialtyMap.has(specKey)) {
          this.tierSpecialtyMap.set(specKey, []);
        }
        this.tierSpecialtyMap.get(specKey)!.push(r);

        const tierKey = `${ds.type}|${normTier}`;
        if (!this.tierMap.has(tierKey)) {
          this.tierMap.set(tierKey, []);
        }
        this.tierMap.get(tierKey)!.push(r);
      }
    }

    this.allSpecialties = Array.from(specSet).sort();
    for (const [spec, procs] of specProcMap.entries()) {
      this.specialtyToProcedures.set(spec, Array.from(procs).sort());
    }
  }

  public getCities(): { name: string; count: number }[] {
    return this.allCities;
  }

  public getDatasetMetadata() {
    return DATASET_METADATA;
  }

  public getTaxonomy(): {
    specialties: string[];
    proceduresBySpecialty: Record<string, string[]>;
    datasetMetadata: typeof DATASET_METADATA;
  } {
    const proceduresBySpecialty: Record<string, string[]> = {};
    for (const [spec, procs] of this.specialtyToProcedures.entries()) {
      proceduresBySpecialty[spec] = procs;
    }
    return {
      specialties: this.allSpecialties,
      proceduresBySpecialty,
      datasetMetadata: DATASET_METADATA
    };
  }

  private computeAggregateFromList(list: CostRecord[]): CostRecord | null {
    if (!list || list.length === 0) return null;
    const count = list.length;
    let sumLow = 0, sumMean = 0, sumHigh = 0, sumStay = 0;
    let sumGen = 0, sumTwin = 0, sumSingle = 0;

    for (const r of list) {
      sumLow += r.low_cost;
      sumMean += r.mean_cost;
      sumHigh += r.highest_cost;
      sumStay += r.estimated_stay_days;
      sumGen += r.general_ward_cost_per_day;
      sumTwin += r.twin_sharing_cost_per_day;
      sumSingle += r.single_private_room_cost_per_day;
    }

    return {
      tier: list[0].tier,
      specialty: list[0].specialty,
      procedure: 'Average',
      low_cost: Math.round(sumLow / count),
      mean_cost: Math.round(sumMean / count),
      highest_cost: Math.round(sumHigh / count),
      estimated_stay_days: Math.round((sumStay / count) * 10) / 10,
      general_ward_cost_per_day: Math.round(sumGen / count),
      twin_sharing_cost_per_day: Math.round(sumTwin / count),
      single_private_room_cost_per_day: Math.round(sumSingle / count),
      isAggregate: true
    };
  }

  private getCostRecord(hospitalType: string, tier: string, specialty?: string, procedure?: string): { record: CostRecord | null; level: 'procedure' | 'specialty' | 'tier' | 'unavailable' } {
    const dsType = normalize(hospitalType) === 'government' ? 'government' : 'private';
    const normTier = normalize(tier);
    const normSpec = normalize(specialty);
    const normProc = normalize(procedure);

    // 1. Exact procedure
    if (normSpec && normProc) {
      const exactKey = `${dsType}|${normTier}|${normSpec}|${normProc}`;
      if (this.costRecordsMap.has(exactKey)) {
        return {
          record: this.costRecordsMap.get(exactKey)!,
          level: 'procedure'
        };
      }
    }

    // 2. Specialty average
    if (normSpec) {
      const specKey = `${dsType}|${normTier}|${normSpec}`;
      const list = this.tierSpecialtyMap.get(specKey);
      if (list && list.length > 0) {
        return {
          record: this.computeAggregateFromList(list),
          level: 'specialty'
        };
      }
    }

    // 3. Tier average (city only)
    const tierKey = `${dsType}|${normTier}`;
    const tierList = this.tierMap.get(tierKey);
    if (tierList && tierList.length > 0) {
      return {
        record: this.computeAggregateFromList(tierList),
        level: 'tier'
      };
    }

    return {
      record: null,
      level: 'unavailable'
    };
  }

  private getSegmentAdjustedCost(low: number, mean: number, high: number, segment: string, hospType: string): number {
    if (normalize(hospType) === 'government') {
      return mean;
    }

    const pos = SEGMENT_POSITION[normalize(segment)] ?? 0.50;
    if (pos <= 0.50) {
      return low + (mean - low) * (pos / 0.50);
    } else {
      return mean + (high - mean) * ((pos - 0.50) / 0.50);
    }
  }

  public calculateHospitalEstimate(
    hospital: HospitalRecord,
    specialty?: string,
    procedure?: string,
    roomType: RoomCategory = 'General Ward'
  ): HospitalEstimate {
    const lookup = this.getCostRecord(hospital.hospital_type, hospital.tier, specialty, procedure);
    if (!lookup.record) {
      return {
        available: false,
        level: 'unavailable',
        estimateLevel: 'unavailable',
        estimateBasis: 'fallback_reference',
        estimateLevelLabel: 'Estimate Unavailable',
        lowCost: 0,
        meanCost: 0,
        highestCost: 0,
        segmentAdjustedCost: 0,
        hospitalVariation: 0,
        treatmentCost: 0,
        roomCost: 0,
        totalCost: 0,
        displayLow: 0,
        displayHigh: 0,
        estimatedStayDays: 0,
        roomCostPerDay: 0,
        generalWardRate: 0,
        twinSharingRate: 0,
        singlePrivateRate: 0
      };
    }

    const rec = lookup.record;
    const lowCost = rec.low_cost;
    const meanCost = rec.mean_cost;
    const highestCost = rec.highest_cost;

    const segmentAdjustedCost = this.getSegmentAdjustedCost(
      lowCost,
      meanCost,
      highestCost,
      hospital.segment,
      hospital.hospital_type
    );

    const hospitalVariation = getHospitalVariation(hospital);
    let treatmentCost = segmentAdjustedCost * (1 + hospitalVariation);
    treatmentCost = Math.max(lowCost, Math.min(treatmentCost, highestCost));

    const colKey = ROOM_KEYS[roomType] || ROOM_KEYS['General Ward'];
    const roomCostPerDay = rec[colKey] || 0;
    const stayDays = Math.max(ESTIMATION_ASSUMPTIONS.minStayDays, rec.estimated_stay_days || 0);
    const roomCost = roomCostPerDay * stayDays;

    // Procedure cost directly from dataset logic (segment adjusted + deterministic variation)
    const procedureCost = Math.round(treatmentCost);
    // Doctor fees: 20% modeled prototype allocation
    const doctorFees = Math.round(procedureCost * ESTIMATION_ASSUMPTIONS.doctorFeeShare);
    // Medicines & Lab tests: 10% modeled prototype allocation
    const medicineLabCost = Math.round(procedureCost * ESTIMATION_ASSUMPTIONS.medicineLabShare);

    // Total cost = Procedure + Doctor Fees (20%) + Medicines & Lab Tests (10%) + Room Charges
    const totalCost = procedureCost + doctorFees + medicineLabCost + roomCost;

    const combinedMultiplier = 1 + ESTIMATION_ASSUMPTIONS.doctorFeeShare + ESTIMATION_ASSUMPTIONS.medicineLabShare;
    const displayLow = Math.round(Math.max(lowCost, procedureCost * 0.90) * combinedMultiplier + roomCost);
    const displayHigh = Math.round(Math.min(highestCost, procedureCost * 1.10) * combinedMultiplier + roomCost);

    let estimateBasis: 'procedure_reference' | 'specialty_reference' | 'tier_reference' | 'hospital_modeled' | 'fallback_reference' = 'procedure_reference';
    let estimateLevelLabel = 'Procedure-Level Estimate';
    if (lookup.level === 'procedure') {
      estimateBasis = 'procedure_reference';
      estimateLevelLabel = 'Procedure-Level Estimate';
    } else if (lookup.level === 'specialty') {
      estimateBasis = 'specialty_reference';
      estimateLevelLabel = 'Specialty Average Estimate';
    } else if (lookup.level === 'tier') {
      estimateBasis = 'tier_reference';
      estimateLevelLabel = 'City Tier Average Estimate';
    } else {
      estimateBasis = 'fallback_reference';
      estimateLevelLabel = 'Reference Cost Estimate';
    }

    return {
      available: true,
      level: lookup.level,
      estimateLevel: lookup.level,
      estimateBasis,
      estimateLevelLabel,
      lowCost,
      meanCost,
      highestCost,
      segmentAdjustedCost: Math.round(segmentAdjustedCost),
      hospitalVariation,
      treatmentCost: procedureCost,
      roomCost: Math.round(roomCost),
      totalCost: Math.round(totalCost),
      displayLow,
      displayHigh,
      estimatedStayDays: rec.estimated_stay_days,
      roomCostPerDay,
      generalWardRate: rec.general_ward_cost_per_day || 0,
      twinSharingRate: rec.twin_sharing_cost_per_day || 0,
      singlePrivateRate: rec.single_private_room_cost_per_day || 0
    };
  }

  private cleanInsurerToken(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public isInsurerEmpanelled(hospital: HospitalRecord, insurerName: string, aliases: string[] = []): boolean {
    if (!insurerName || !insurerName.trim()) return false;

    const candList = [insurerName, ...aliases].map(a => this.cleanInsurerToken(a)).filter(Boolean);
    if (candList.length === 0) return false;

    // Clean hospital parsed insurers
    const hospInsurersClean = (hospital.insurers || []).map(i => this.cleanInsurerToken(i)).filter(Boolean);
    if (hospInsurersClean.length === 0 && !hospital.insurersRaw) return false;

    // Escape regex utility
    const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const cand of candList) {
      const candCompact = cand.replace(/\s+/g, '');

      for (const hIns of hospInsurersClean) {
        // 1. Exact clean match
        if (hIns === cand) return true;

        // 2. Compact alphanumeric match (e.g. "pmjay" vs "pm jay")
        const hCompact = hIns.replace(/\s+/g, '');
        if (hCompact.length >= 3 && hCompact === candCompact) return true;

        // 3. Word-boundary phrase matching (e.g. "Star Health" matching "Star Health and Allied Insurance")
        if (hIns.length >= 4) {
          const rx = new RegExp(`(^|\\s)${escapeRx(hIns)}($|\\s)`);
          if (rx.test(cand)) return true;
        }
        if (cand.length >= 4) {
          const rx = new RegExp(`(^|\\s)${escapeRx(cand)}($|\\s)`);
          if (rx.test(hIns)) return true;
        }
      }
    }

    return false;
  }

  public evaluateNetworkStatus(
    hospital: HospitalRecord,
    insurerName?: string,
    aliases: string[] = [],
    isFallbackNetwork: boolean = false
  ): NetworkStatus {
    if (!insurerName || !insurerName.trim()) {
      return 'unknown';
    }

    if (isFallbackNetwork) {
      return 'unverified';
    }

    const isMatch = this.isInsurerEmpanelled(hospital, insurerName, aliases);
    if (isMatch) {
      return 'verified';
    }

    // Check if the hospital has network/insurer reference data in the dataset
    const hasNetworkData = (hospital.insurers && hospital.insurers.length > 0) || Boolean(hospital.insurersRaw && hospital.insurersRaw.trim());
    if (!hasNetworkData) {
      return 'unverified';
    }

    // Lookup was performed against reference data and found no match
    return 'no_match';
  }

  public calculatePolicyAdjudication(
    estimate: HospitalEstimate,
    policy: PolicyDocument,
    roomType: RoomCategory = 'General Ward',
    specialty?: string,
    procedure?: string,
    customBillAmount?: number
  ): {
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
  } {
    const stayDays = Math.max(ESTIMATION_ASSUMPTIONS.minStayDays, Math.round(estimate.estimatedStayDays || 1));
    const roomRate = estimate.roomCostPerDay;
    const roomCharges = Math.round(roomRate * stayDays);

    let procedureCharges: number;
    let doctorFees: number;
    let medicineCharges: number;
    let otherCharges = 0;
    let totalBill: number;

    if (customBillAmount && customBillAmount > 0) {
      totalBill = customBillAmount;
      const remainingCharges = Math.max(0, customBillAmount - roomCharges);
      procedureCharges = Math.round(remainingCharges * 0.70);
      doctorFees = Math.round(remainingCharges * 0.20);
      medicineCharges = Math.max(0, remainingCharges - procedureCharges - doctorFees);
    } else {
      procedureCharges = estimate.treatmentCost;
      // Doctor fees: 20% modeled prototype allocation
      doctorFees = Math.round(procedureCharges * ESTIMATION_ASSUMPTIONS.doctorFeeShare);
      // Medicines & Lab tests: 10% modeled prototype allocation
      medicineCharges = Math.round(procedureCharges * ESTIMATION_ASSUMPTIONS.medicineLabShare);
      totalBill = procedureCharges + doctorFees + medicineCharges + roomCharges;
    }

    const itemizedBill: ItemizedBill = {
      roomCharges,
      roomRatePerDay: roomRate,
      stayDays,
      procedureCharges,
      medicineCharges,
      doctorFees,
      otherCharges,
      totalBill
    };

    // Policy Rule Calculations
    const sumInsured = (typeof policy.sumInsured === 'number' && policy.sumInsured >= 0)
      ? policy.sumInsured
      : ESTIMATION_ASSUMPTIONS.defaultSumInsured;
    const copayPercent = (typeof policy.copay === 'number' && policy.copay >= 0)
      ? policy.copay
      : ESTIMATION_ASSUMPTIONS.defaultCopay;
    const policyDeductible = (typeof policy.deductible === 'number' && policy.deductible >= 0)
      ? policy.deductible
      : ESTIMATION_ASSUMPTIONS.defaultDeductible;

    // 1. Room Limit Evaluation
    let roomLimitEligiblePerDay = 999999;
    let roomLimitType = 'No Capping (Unlimited)';

    if (policy.roomLimit) {
      if (policy.roomLimit.type === 'amount' && policy.roomLimit.value) {
        roomLimitEligiblePerDay = Number(policy.roomLimit.value);
        roomLimitType = `₹${roomLimitEligiblePerDay.toLocaleString('en-IN')}/day`;
      } else if (policy.roomLimit.type === 'percent' && policy.roomLimit.value) {
        const pct = Number(policy.roomLimit.value);
        roomLimitEligiblePerDay = Math.round(sumInsured * (pct / 100));
        roomLimitType = `${pct}% of SI (₹${roomLimitEligiblePerDay.toLocaleString('en-IN')}/day)`;
      } else if (policy.roomLimit.type === 'category' && policy.roomLimit.value) {
        const cat = String(policy.roomLimit.value).trim();
        const catLower = cat.toLowerCase();
        let benchmarkRate: number | undefined;

        if (catLower.includes('general')) {
          benchmarkRate = estimate.generalWardRate;
          if (benchmarkRate && benchmarkRate > 0) {
            roomLimitEligiblePerDay = benchmarkRate;
            roomLimitType = `General Ward (Benchmark: ₹${benchmarkRate.toLocaleString('en-IN')}/day)`;
          } else {
            roomLimitEligiblePerDay = 0;
            roomLimitType = 'General Ward (Benchmark rate unavailable in reference dataset)';
          }
        } else if (catLower.includes('twin') || catLower.includes('sharing')) {
          benchmarkRate = estimate.twinSharingRate;
          if (benchmarkRate && benchmarkRate > 0) {
            roomLimitEligiblePerDay = benchmarkRate;
            roomLimitType = `Twin Sharing (Benchmark: ₹${benchmarkRate.toLocaleString('en-IN')}/day)`;
          } else {
            roomLimitEligiblePerDay = 0;
            roomLimitType = 'Twin Sharing (Benchmark rate unavailable in reference dataset)';
          }
        } else if (catLower.includes('single') || catLower.includes('private')) {
          benchmarkRate = estimate.singlePrivateRate;
          if (benchmarkRate && benchmarkRate > 0) {
            roomLimitEligiblePerDay = benchmarkRate;
            roomLimitType = `Single Private Room (Benchmark: ₹${benchmarkRate.toLocaleString('en-IN')}/day)`;
          } else {
            roomLimitEligiblePerDay = 0;
            roomLimitType = 'Single Private Room (Benchmark rate unavailable in reference dataset)';
          }
        } else {
          roomLimitEligiblePerDay = 0;
          roomLimitType = `${cat} (Benchmark rate unavailable in reference dataset)`;
        }
      }
    }

    let roomRentExcessPerDay = 0;
    if (roomLimitEligiblePerDay > 0 && roomLimitEligiblePerDay < 999999) {
      roomRentExcessPerDay = Math.max(0, roomRate - roomLimitEligiblePerDay);
    }
    const totalRoomRentExcess = roomRentExcessPerDay * stayDays;

    // 2. Proportionate Deduction
    let proportionateDisallowance = 0;
    const proportionateDeductionActive = Boolean(
      policy.proportionateDeduction && roomRentExcessPerDay > 0 && roomLimitEligiblePerDay > 0
    );

    if (proportionateDeductionActive && roomRate > 0) {
      const allowedRatio = Math.min(1, roomLimitEligiblePerDay / roomRate);
      // Proportionate deduction applies to associate medical expenses (procedure, doctor fees)
      const associateMedicalExpenses = procedureCharges + doctorFees;
      proportionateDisallowance = Math.round(associateMedicalExpenses * (1 - allowedRatio));
    }

    // 3. Non-medical consumables (IRDAI non-payable items like gloves, gowns, admin fees ~5% modeled prototype assumption)
    const nonMedicalDeductible = Math.round(totalBill * ESTIMATION_ASSUMPTIONS.nonMedicalShare);

    // 4. Admissible claim before sublimit
    const admissibleBeforeSublimit = Math.max(
      0,
      totalBill - totalRoomRentExcess - proportionateDisallowance - nonMedicalDeductible
    );

    // 5. Disease Sublimit Evaluation
    let diseaseSublimit: number | null = null;
    let sublimitMatchedClause: string | null = null;
    let diseaseSublimitDisallowance = 0;

    if (policy.subLimits && typeof policy.subLimits === 'object') {
      const searchTerms = [procedure, specialty].filter(Boolean).map(s => String(s).toLowerCase());
      for (const [subName, limitVal] of Object.entries(policy.subLimits)) {
        const subNameLower = subName.toLowerCase();
        const isMatched = searchTerms.some(term =>
          term.includes(subNameLower) || subNameLower.includes(term)
        );
        if (isMatched && typeof limitVal === 'number' && limitVal > 0) {
          diseaseSublimit = limitVal;
          sublimitMatchedClause = subName;
          break;
        }
      }
    }

    // Apply Disease Sublimit Capping
    let admissibleAfterSublimit = admissibleBeforeSublimit;
    if (diseaseSublimit !== null && diseaseSublimit > 0) {
      if (admissibleBeforeSublimit > diseaseSublimit) {
        diseaseSublimitDisallowance = admissibleBeforeSublimit - diseaseSublimit;
        admissibleAfterSublimit = diseaseSublimit;
      }
    }

    // 6. Compulsory Deductible (applied to admissible claim before co-pay)
    const deductibleApplied = Math.min(admissibleAfterSublimit, policyDeductible);
    const admissibleAfterDeductible = Math.max(0, admissibleAfterSublimit - deductibleApplied);

    // 7. Co-pay calculation
    const copayAmount = Math.round(admissibleAfterDeductible * (copayPercent / 100));
    const claimAfterCopay = Math.max(0, admissibleAfterDeductible - copayAmount);

    // 8. Excess over Sum Insured
    const excessOverSumInsured = Math.max(0, claimAfterCopay - sumInsured);

    // 9. Insurer Share and Patient Share
    const estimatedInsurerShare = Math.min(sumInsured, claimAfterCopay);
    const estimatedPatientShare = Math.max(0, totalBill - estimatedInsurerShare);
    const totalPatientPayable = estimatedPatientShare;
    const totalInsuranceCovered = estimatedInsurerShare;
    const reconciled = (estimatedInsurerShare + estimatedPatientShare === totalBill);

    // 10. Traceable Explanation Steps
    const explanationSteps: string[] = [
      `1. Total billed hospital expenses: ₹${totalBill.toLocaleString('en-IN')}.`
    ];

    if (totalRoomRentExcess > 0) {
      explanationSteps.push(
        `2. Room rent limit is capped at ${roomLimitType}. Selected ${roomType} is ₹${roomRate.toLocaleString('en-IN')}/day. Out-of-pocket room excess of ₹${totalRoomRentExcess.toLocaleString('en-IN')} (₹${roomRentExcessPerDay.toLocaleString('en-IN')}/day for ${stayDays} days) deducted.`
      );
    } else {
      explanationSteps.push(
        `2. Selected ${roomType} (₹${roomRate.toLocaleString('en-IN')}/day) fits within eligible room limit (${roomLimitType}). Zero room rent excess.`
      );
    }

    if (proportionateDisallowance > 0) {
      const ratio = (roomLimitEligiblePerDay / roomRate).toFixed(3);
      explanationSteps.push(
        `3. Proportionate deduction active: Associated medical expenses adjusted by eligible ratio ${ratio} (₹${roomLimitEligiblePerDay.toLocaleString('en-IN')} / ₹${roomRate.toLocaleString('en-IN')}), resulting in ₹${proportionateDisallowance.toLocaleString('en-IN')} disallowance.`
      );
    }

    if (nonMedicalDeductible > 0) {
      explanationSteps.push(
        `4. Non-medical consumables (IRDAI non-payable items, administrative charges): Estimated ₹${nonMedicalDeductible.toLocaleString('en-IN')} (5% reference allocation) borne by patient.`
      );
    }

    if (diseaseSublimit !== null && diseaseSublimitDisallowance > 0) {
      explanationSteps.push(
        `5. Disease-specific sublimit for '${sublimitMatchedClause}' capped admissible amount at ₹${diseaseSublimit.toLocaleString('en-IN')}, disallowing excess of ₹${diseaseSublimitDisallowance.toLocaleString('en-IN')}.`
      );
    }

    if (deductibleApplied > 0) {
      explanationSteps.push(
        `6. Compulsory policy deductible of ₹${deductibleApplied.toLocaleString('en-IN')} paid out-of-pocket before insurance sharing.`
      );
    }

    if (copayAmount > 0) {
      explanationSteps.push(
        `7. ${copayPercent}% co-payment applied across admissible base of ₹${admissibleAfterDeductible.toLocaleString('en-IN')}: Patient co-pay share is ₹${copayAmount.toLocaleString('en-IN')}.`
      );
    } else {
      explanationSteps.push(
        `7. 0% co-payment applicable across empanelled network facilities.`
      );
    }

    if (excessOverSumInsured > 0) {
      explanationSteps.push(
        `8. Claim exceeds available Sum Insured (₹${sumInsured.toLocaleString('en-IN')}) by ₹${excessOverSumInsured.toLocaleString('en-IN')}.`
      );
    }

    explanationSteps.push(
      `9. Final reconciled estimate: Insurer covers ₹${estimatedInsurerShare.toLocaleString('en-IN')}; Estimated patient liability is ₹${estimatedPatientShare.toLocaleString('en-IN')}.`
    );

    return {
      itemizedBill,
      roomLimitEligiblePerDay,
      roomLimitType,
      roomRentExcessPerDay,
      totalRoomRentExcess,
      proportionateDeductionActive,
      proportionateDisallowance,
      copayPercent,
      copayAmount,
      policyDeductible,
      deductibleApplied,
      excessOverSumInsured,
      nonMedicalDeductible,
      totalPatientPayable,
      totalInsuranceCovered,
      estimatedPatientShare,
      estimatedInsurerShare,
      reconciled,
      allowedBeforeSublimit: admissibleBeforeSublimit,
      diseaseSublimit,
      diseaseSublimitDisallowance,
      sublimitMatchedClause,
      explanationSteps
    };
  }

  public rankHospitals(
    hospitals: HospitalRecord[],
    policy: PolicyDocument,
    specialty?: string,
    procedure?: string,
    roomType: RoomCategory = 'General Ward',
    isFallbackNetwork: boolean = false
  ): RankedHospitalItem[] {
    const sumInsured = policy.sumInsured && policy.sumInsured > 0 ? policy.sumInsured : ESTIMATION_ASSUMPTIONS.defaultSumInsured;
    const copayPercent = typeof policy.copay === 'number' && policy.copay >= 0 ? policy.copay : ESTIMATION_ASSUMPTIONS.defaultCopay;

    // 1. Calculate estimates and raw payable for all hospitals
    interface PreRankItem {
      hospital: HospitalRecord;
      estimate: HospitalEstimate;
      patientPayable: number;
      coPayAmount: number;
      excessOverSI: number;
      deductibleApplied: number;
      coverageFit: number;
      hospitalTypeScore: number;
      coPayFit: number;
    }

    const preItems: PreRankItem[] = [];

    for (const h of hospitals) {
      const est = this.calculateHospitalEstimate(h, specialty, procedure, roomType);
      if (!est.available) continue;

      const adjudication = this.calculatePolicyAdjudication(est, policy, roomType);
      const C = est.totalCost;

      // 1. CoverageFit (50%)
      // CoverageRatio = C / SI
      const coverageRatio = policy.policyType === 'esi' ? 0.3 : (C / sumInsured);
      let coverageFit = 0;
      if (coverageRatio <= 0.60) coverageFit = 100;
      else if (coverageRatio <= 0.80) coverageFit = 90;
      else if (coverageRatio <= 1.00) coverageFit = 75;
      else if (coverageRatio <= 1.20) coverageFit = 50;
      else if (coverageRatio <= 1.50) coverageFit = 25;
      else coverageFit = 0;

      // 2. PatientPayable calculation: reconciled with detailed breakdown
      const patientPayable = adjudication.estimatedPatientShare;
      const coPayAmount = adjudication.copayAmount;
      const excessOverSI = adjudication.excessOverSumInsured;
      const deductibleApplied = adjudication.deductibleApplied;

      // 3. HospitalTypeScore (15%)
      // Government / Budget -> 100
      // Standard Private -> 85
      // Established -> 75
      // Premium -> 60
      // Luxury -> 45
      const segNorm = normalize(h.segment);
      const typeNorm = normalize(h.hospital_type);
      let hospitalTypeScore = 75;
      if (typeNorm === 'government' || segNorm.includes('budget') || segNorm.includes('local')) {
        hospitalTypeScore = 100;
      } else if (segNorm.includes('standard')) {
        hospitalTypeScore = 85;
      } else if (segNorm.includes('established')) {
        hospitalTypeScore = 75;
      } else if (segNorm.includes('premium')) {
        hospitalTypeScore = 60;
      } else if (segNorm.includes('luxury')) {
        hospitalTypeScore = 45;
      }

      // 4. CoPayFit (10%)
      // AdjustedCost = C * (1 + CoPay%)
      // Compare AdjustedCost with SI
      const adjustedCost = C * (1 + copayPercent / 100);
      const adjustedRatio = policy.policyType === 'esi' ? 0.4 : (adjustedCost / sumInsured);
      let coPayFit = 15;
      if (adjustedRatio <= 0.70) coPayFit = 100;
      else if (adjustedRatio <= 0.90) coPayFit = 85;
      else if (adjustedRatio <= 1.00) coPayFit = 70;
      else if (adjustedRatio <= 1.20) coPayFit = 40;
      else coPayFit = 15;

      preItems.push({
        hospital: h,
        estimate: est,
        patientPayable,
        coPayAmount,
        excessOverSI,
        deductibleApplied,
        coverageFit,
        hospitalTypeScore,
        coPayFit
      });
    }

    if (preItems.length === 0) return [];

    // Find MaxPayable and MinPayable across candidates for normalization
    let maxPayable = preItems[0].patientPayable;
    let minPayable = preItems[0].patientPayable;

    for (const item of preItems) {
      if (item.patientPayable > maxPayable) maxPayable = item.patientPayable;
      if (item.patientPayable < minPayable) minPayable = item.patientPayable;
    }

    // 2. Calculate PatientCostFit & FinalScore
    const ranked: RankedHospitalItem[] = preItems.map(item => {
      let patientCostFit = 100;
      if (maxPayable !== minPayable) {
        patientCostFit = 100 * ((maxPayable - item.patientPayable) / (maxPayable - minPayable));
        patientCostFit = Math.max(0, Math.min(100, Math.round(patientCostFit)));
      }

      // SehatSure Formula:
      // FinalScore = 0.50(CoverageFit) + 0.25(PatientCostFit) + 0.15(HospitalTypeScore) + 0.10(CoPayFit)
      const finalScore = Math.round(
        (0.50 * item.coverageFit) +
        (0.25 * patientCostFit) +
        (0.15 * item.hospitalTypeScore) +
        (0.10 * item.coPayFit)
      );

      const score: ScoreBreakdown = {
        coverageFit: item.coverageFit,
        patientCostFit,
        hospitalTypeScore: item.hospitalTypeScore,
        coPayFit: item.coPayFit,
        finalScore,
        patientPayable: item.patientPayable,
        estimatedPatientShare: item.patientPayable,
        coPayAmount: item.coPayAmount,
        excessOverSI: item.excessOverSI,
        deductibleApplied: item.deductibleApplied
      };

      const networkStatus = this.evaluateNetworkStatus(
        item.hospital,
        policy.insurer || undefined,
        policy.insurerAliases || [],
        isFallbackNetwork
      );

      return {
        hospital: item.hospital,
        estimate: item.estimate,
        score,
        rank: 0,
        networkStatus,
        specialtyStatus: 'DATASET_LISTED' as const,
        networkProvenance: networkStatus === 'verified' ? 'NETWORK_REFERENCE_MATCH' : 'NETWORK_NOT_MATCHED',
        isEmpanelled: networkStatus === 'verified'
      };
    });

    // 3. Sort:
    // Primary: FinalScore DESC
    // Secondary: PatientPayable ASC
    // Tertiary: LowCost ASC
    ranked.sort((a, b) => {
      if (b.score.finalScore !== a.score.finalScore) {
        return b.score.finalScore - a.score.finalScore;
      }
      if (a.score.patientPayable !== b.score.patientPayable) {
        return a.score.patientPayable - b.score.patientPayable;
      }
      return a.estimate.lowCost - b.estimate.lowCost;
    });

    // Assign 1-based ranks
    ranked.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return ranked;
  }

  public findHospital(criteria: {
    hospitalId?: string;
    hospitalName: string;
    city?: string;
    address?: string;
  }): { hospital: HospitalRecord | null; error?: string; matches?: HospitalRecord[] } {
    if (criteria.hospitalId) {
      const byId = this.hospitals.find(h => h.hospital_id === criteria.hospitalId);
      if (byId) return { hospital: byId };
    }

    const normTarget = normalize(criteria.hospitalName);
    const nameMatches = this.hospitals.filter(h => normalize(h.hospital_name) === normTarget);

    if (nameMatches.length === 0) {
      // Substring match fallback
      const partial = this.hospitals.filter(h =>
        normalize(h.hospital_name).includes(normTarget) || normTarget.includes(normalize(h.hospital_name))
      );
      if (partial.length === 1) return { hospital: partial[0] };
      if (partial.length > 1 && criteria.city) {
        const cityFiltered = partial.filter(h => normalize(h.city) === normalize(criteria.city));
        if (cityFiltered.length === 1) return { hospital: cityFiltered[0] };
      }
      return { hospital: null, error: `Hospital '${criteria.hospitalName}' not found in reference dataset.` };
    }

    if (nameMatches.length === 1) {
      const single = nameMatches[0];
      if (criteria.city && normalize(single.city) !== normalize(criteria.city)) {
        return {
          hospital: null,
          error: `Hospital '${criteria.hospitalName}' is located in '${single.city}', not '${criteria.city}'.`
        };
      }
      return { hospital: single };
    }

    // Multiple facilities with the same name (e.g. Apollo, Fortis, Care)
    if (criteria.city) {
      const inCity = nameMatches.filter(h => normalize(h.city) === normalize(criteria.city));
      if (inCity.length === 0) {
        return {
          hospital: null,
          error: `Multiple branches of '${criteria.hospitalName}' exist, but none in '${criteria.city}'.`,
          matches: nameMatches
        };
      }
      if (inCity.length === 1) {
        return { hospital: inCity[0] };
      }
      // Multiple branches in the SAME city
      if (criteria.address && criteria.address.trim()) {
        const normAddr = normalize(criteria.address);
        const addrMatch = inCity.find(h =>
          normalize(h.address).includes(normAddr.slice(0, 20)) ||
          normAddr.includes(normalize(h.address).slice(0, 20))
        );
        if (addrMatch) return { hospital: addrMatch };
      }
      return {
        hospital: null,
        error: `Ambiguous hospital branch: multiple facilities found for '${criteria.hospitalName}' in '${criteria.city}'. Please provide a specific address or unique ID.`,
        matches: inCity
      };
    }

    // No city provided, but multiple facilities exist across India
    if (criteria.address && criteria.address.trim()) {
      const normAddr = normalize(criteria.address);
      const addrMatches = nameMatches.filter(h =>
        normalize(h.address).includes(normAddr.slice(0, 20)) ||
        normAddr.includes(normalize(h.address).slice(0, 20))
      );
      if (addrMatches.length === 1) return { hospital: addrMatches[0] };
    }

    return {
      hospital: null,
      error: `Ambiguous hospital branch: '${criteria.hospitalName}' has multiple branches across different cities. Please specify the city or address.`,
      matches: nameMatches
    };
  }

  public getDetailedBillBreakdown(
    hospitalName: string,
    hospitalAddress: string,
    policy: PolicyDocument,
    specialty?: string,
    procedure?: string,
    roomType: RoomCategory = 'General Ward',
    city?: string,
    hospitalId?: string,
    customBillAmount?: number
  ): PolicyImpactBreakdown | null {
    const searchRes = this.findHospital({
      hospitalId,
      hospitalName,
      city,
      address: hospitalAddress
    });

    const hosp = searchRes.hospital;
    if (!hosp) return null;

    const estimate = this.calculateHospitalEstimate(hosp, specialty, procedure, roomType);
    if (!estimate.available) return null;

    const adjudication = this.calculatePolicyAdjudication(
      estimate,
      policy,
      roomType,
      specialty,
      procedure,
      customBillAmount
    );

    // AI Smart Recommendations & Advice
    const aiRecommendations: PolicyImpactBreakdown['aiRecommendations'] = [];

    if (adjudication.totalRoomRentExcess > 0) {
      const savingsIfDowngraded = adjudication.totalRoomRentExcess + adjudication.proportionateDisallowance;
      aiRecommendations.push({
        type: 'warning',
        title: 'Room Rent Exceeds Policy Limit',
        message: `Your policy caps room rent at ${adjudication.roomLimitType}. The selected ${roomType} costs ₹${estimate.roomCostPerDay.toLocaleString('en-IN')}/day, leaving an excess of ₹${adjudication.roomRentExcessPerDay.toLocaleString('en-IN')}/day to be paid out-of-pocket.`,
        actionable: `Switching to an eligible room category (e.g. Twin Sharing or General Ward) could save you up to ₹${savingsIfDowngraded.toLocaleString('en-IN')}!`
      });
    }

    if (adjudication.proportionateDisallowance > 0) {
      aiRecommendations.push({
        type: 'warning',
        title: 'Potential Proportionate Deduction Active',
        message: `Because the selected room exceeds the policy limit, doctor and procedure charges have a potential proportionate deduction of ₹${adjudication.proportionateDisallowance.toLocaleString('en-IN')}. Choosing a compliant room category prevents this deduction.`
      });
    }

    if (adjudication.diseaseSublimit !== null && adjudication.diseaseSublimit !== undefined && (adjudication.diseaseSublimitDisallowance || 0) > 0) {
      aiRecommendations.push({
        type: 'warning',
        title: `Disease Sublimit Applied (${adjudication.sublimitMatchedClause || 'Procedure Cap'})`,
        message: `Your policy caps coverage for ${adjudication.sublimitMatchedClause || 'this procedure'} at ₹${adjudication.diseaseSublimit.toLocaleString('en-IN')}. An excess of ₹${(adjudication.diseaseSublimitDisallowance || 0).toLocaleString('en-IN')} beyond the sublimit ceiling is payable out-of-pocket.`
      });
    }

    if (adjudication.deductibleApplied > 0) {
      aiRecommendations.push({
        type: 'info',
        title: 'Compulsory Policy Deductible Applied',
        message: `Your policy specifies a compulsory deductible of ₹${adjudication.policyDeductible.toLocaleString('en-IN')}. The first ₹${adjudication.deductibleApplied.toLocaleString('en-IN')} of admissible medical expenses is paid out-of-pocket before insurance coverage commences.`
      });
    }

    if (adjudication.excessOverSumInsured > 0) {
      aiRecommendations.push({
        type: 'warning',
        title: 'Estimated Cost Exceeds Sum Insured',
        message: `The total estimated cost exceeds your available Sum Insured of ₹${(policy.sumInsured || ESTIMATION_ASSUMPTIONS.defaultSumInsured).toLocaleString('en-IN')} by ₹${adjudication.excessOverSumInsured.toLocaleString('en-IN')}. Consider checking standard private or government network facilities in this city.`
      });
    } else {
      aiRecommendations.push({
        type: 'success',
        title: 'Estimated Cost Fits Within Available Sum Insured',
        message: `The total estimated treatment cost fits within your ₹${(policy.sumInsured || ESTIMATION_ASSUMPTIONS.defaultSumInsured).toLocaleString('en-IN')} Sum Insured ceiling. Actual coverage depends on policy terms, exclusions, limits, pre-authorization, and insurer claim adjudication.`
      });
    }

    if (adjudication.copayPercent > 0) {
      aiRecommendations.push({
        type: 'info',
        title: `${adjudication.copayPercent}% Co-payment Required`,
        message: `Your policy mandates a ${adjudication.copayPercent}% co-pay (₹${adjudication.copayAmount.toLocaleString('en-IN')}) on admissible claims after deductible.`
      });
    }

    return {
      roomType,
      itemizedBill: adjudication.itemizedBill,
      roomLimitEligiblePerDay: adjudication.roomLimitEligiblePerDay,
      roomLimitType: adjudication.roomLimitType,
      roomRentExcessPerDay: adjudication.roomRentExcessPerDay,
      totalRoomRentExcess: adjudication.totalRoomRentExcess,
      proportionateDeductionActive: adjudication.proportionateDeductionActive,
      proportionateDisallowance: adjudication.proportionateDisallowance,
      copayPercent: adjudication.copayPercent,
      copayAmount: adjudication.copayAmount,
      policyDeductible: adjudication.policyDeductible,
      deductibleApplied: adjudication.deductibleApplied,
      excessOverSumInsured: adjudication.excessOverSumInsured,
      nonMedicalDeductible: adjudication.nonMedicalDeductible,
      totalPatientPayable: adjudication.totalPatientPayable,
      totalInsuranceCovered: adjudication.totalInsuranceCovered,
      estimatedPatientShare: adjudication.estimatedPatientShare,
      estimatedInsurerShare: adjudication.estimatedInsurerShare,
      reconciled: adjudication.reconciled,
      allowedBeforeSublimit: adjudication.allowedBeforeSublimit,
      diseaseSublimit: adjudication.diseaseSublimit,
      diseaseSublimitDisallowance: adjudication.diseaseSublimitDisallowance,
      sublimitMatchedClause: adjudication.sublimitMatchedClause,
      explanationSteps: adjudication.explanationSteps,
      estimateLevel: estimate.estimateLevel,
      estimateBasis: estimate.estimateBasis,
      estimateLevelLabel: estimate.estimateLevelLabel,
      aiRecommendations
    };
  }

  public search(params: {
    policy: PolicyDocument;
    city?: string;
    specialty?: string;
    procedure?: string;
    roomType?: RoomCategory;
    networkOnly?: boolean;
  }): HospitalSearchResponse {
    const { policy, city, specialty, procedure, roomType = 'General Ward', networkOnly = false } = params;

    let candidateHospitals: HospitalRecord[] = [];

    if (city && city.trim().length > 0) {
      const normCity = normalize(city);
      candidateHospitals = this.hospitalsByCity.get(normCity) || [];
      if (candidateHospitals.length === 0) {
        // Fallback search in addresses
        candidateHospitals = this.hospitals.filter(h =>
          normalize(h.city).includes(normCity) || normalize(h.address).includes(normCity)
        );
      }
    } else {
      // Default to Bengaluru or first top city if none provided
      candidateHospitals = this.hospitalsByCity.get('bengaluru') || this.hospitals.slice(0, 500);
    }

    const totalCityHospitals = candidateHospitals.length;

    // 1. Filter: Reference Network Match
    const insurerName = policy.insurer || '';
    const aliases = policy.insurerAliases || [];
    let isFallbackNetwork = false;
    const networkMatchedHospitals = candidateHospitals.filter(h =>
      this.isInsurerEmpanelled(h, insurerName, aliases)
    );
    const networkFacilityCount = networkMatchedHospitals.length;

    let filtered = networkMatchedHospitals;

    // If no hospital matched with strict insurer filter:
    // If networkOnly is requested, do not fall back (return 0 verified matches)
    // Otherwise fallback to candidate hospitals with explicit unverified status
    if (filtered.length === 0) {
      if (!networkOnly && candidateHospitals.length > 0) {
        filtered = candidateHospitals;
        isFallbackNetwork = true;
      }
    }

    // 2. Hard Filter: Exact Specialty Match (normalized & canonical)
    let specialtyMatchedCount = filtered.length;
    if (specialty && specialty.trim().length > 0) {
      const targetSpec = getCanonicalSpecialty(specialty);
      specialtyMatchedCount = filtered.filter(h =>
        h.specialties.some(s => getCanonicalSpecialty(s) === targetSpec)
      ).length;

      filtered = filtered.filter(h =>
        h.specialties.some(s => getCanonicalSpecialty(s) === targetSpec)
      );
    }

    // 3. Hard Filter: Procedure Match (if specified)
    let procedureMatchedCount: number | undefined;
    if (procedure && procedure.trim().length > 0) {
      procedureMatchedCount = filtered.length;
    }

    // 4. Rank remaining hospitals
    let ranked = this.rankHospitals(filtered, policy, specialty, procedure, roomType, isFallbackNetwork);

    if (networkOnly) {
      ranked = ranked.filter(h => h.networkStatus === 'verified');
    }

    // Calculate city average cost
    let cityAverageCost = 0;
    if (ranked.length > 0) {
      const sum = ranked.reduce((acc, curr) => acc + curr.estimate.totalCost, 0);
      cityAverageCost = Math.round(sum / ranked.length);
    }

    return {
      hospitals: ranked,
      totalCount: ranked.length,
      cityAverageCost,
      isFallbackNetwork,
      totalCityHospitals,
      networkFacilityCount,
      specialtyMatchedCount,
      procedureMatchedCount
    };
  }
}

export const hospitalService = new HospitalService();
