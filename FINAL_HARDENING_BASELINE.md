# SehatSure — Final Hardening Baseline Assessment
**Date:** September 2026  
**Auditor:** Principal Product & Full-Stack Reliability Engineer  
**Status:** Baseline established prior to final competition-grade hardening  

---

## 1. Executive Summary & Verification State
The SehatSure platform is an **insurance-aware healthcare decision support system**. It enables policyholders and patients to understand health insurance constraints (Sum Insured, Room Rent caps, Proportionate Deductions, Co-pays, Sublimits, and Network Status) before admission or treatment.

### Current Service Execution Baseline
| Service | Target Port | Status | Verification Method |
|---|---|---|---|
| **Backend API** (Express + TSX) | `5000` | **HEALTHY** (`200 OK`) | `GET /api/health` responded with `{"status":"healthy","service":"SehatSure Backend"}` |
| **Frontend Client** (Vite + React 19) | `5173` | **HEALTHY** (`200 OK`) | `GET http://localhost:5173/` returned 200; bundle compilation verified |
| **Dataset Engine** | Memory / CSV | **INDEXED** | 53,022 hospitals and cost datasets indexed in resilient memory mode |
| **Test Suite** | Vitest | **90 / 90 PASSED** | 9 test suites executed in 36.11s with 0 failures |
| **Client Production Build** | TypeScript + Vite | **PASSED** | `dist/` built with 0 type errors (389 kB JS, 91 kB CSS) |
| **Server Production Build** | `tsc` | **PASSED** | `dist/` compiled with 0 type errors |

---

## 2. Current Architecture & Core Components

```
sehatsure/
├── client/                     # Vite + React 19 + TypeScript + Vanilla CSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx           # Home entry & demo policy launcher
│   │   │   ├── PolicyXRayPage.tsx        # Policy constraint extractor & provenance
│   │   │   ├── FinancialImpactPage.tsx   # Financial impact simulator (room/procedure)
│   │   │   ├── HospitalDiscoveryPage.tsx # Hospital matching, city & specialty filtering
│   │   │   ├── HospitalComparisonPage.tsx# Multi-hospital side-by-side comparison
│   │   │   ├── RoomComparisonPage.tsx    # Cheaper room savings & tier analysis
│   │   │   ├── CareJourneyPage.tsx       # Pre-admission to discharge guidance
│   │   │   └── WhatToVerifyPage.tsx      # TPA / Hospital verification checklist
│   │   ├── components/                   # TopHeader, Sidebar, Modals, Provenance
│   │   └── services/                     # api.ts, hospitalApi.ts
│   └── vite.config.ts
├── server/                     # Express 4 + Node.js 24 + TypeScript (ESM)
│   ├── src/
│   │   ├── controllers/        # policyController.ts, hospitalController.ts
│   │   ├── services/
│   │   │   ├── hospitalService.ts        # 53k hospitals dataset, cost engine, ranking
│   │   │   ├── geminiService.ts          # AI policy extraction (Google Generative AI)
│   │   │   ├── normalizerService.ts      # Multi-schema cleaning & coercion
│   │   │   ├── overrideService.ts        # PM-JAY / ESI statutory overrides & Tier 2 defaults
│   │   │   └── inMemoryPolicyStore.ts    # Resilient in-memory policy persistence
│   │   ├── schemas/policySchema.ts       # Zod validation schema & Tier 1 requirements
│   │   └── routes/                       # policyRoutes.ts, hospitalRoutes.ts
│   └── tests/                  # 9 test files (90 vitest unit/integration tests)
├── hospitals.csv               # 53,022 hospital records across 21,401 cities
├── pvt_costs.csv               # Private hospital procedure & room benchmark costs
└── govt_costs.csv              # Government / CGHS package benchmark costs
```

---

## 3. Current Test Status
- **Test Files:** 9 passed (9 total)
- **Tests:** 90 passed (90 total)
  - `normalizer.test.ts`: 6 passed
  - `overrides.test.ts`: 4 passed
  - `zodSchema.test.ts`: 4 passed
  - `costCalculations.test.ts`: 28 passed
  - `hospitalCleaning.test.ts`: 2 passed
  - `careJourney.test.ts`: 13 passed
  - `hospitalRanking.test.ts`: 22 passed
  - `policyApi.test.ts`: 3 passed
  - `hospitalController.test.ts`: 8 passed

---

## 4. Current Identified Gaps & Hardening Targets

### A. Financial Calculation Engine & Disease Sublimits
1. **Disease Sublimits Missing in Adjudication:** While `subLimits` were defined in schemas and demo policies, `hospitalService.calculatePolicyAdjudication` and `getDetailedBillBreakdown` did not apply disease-specific caps before co-pay calculation.
2. **Deterministic Seeded Benchmark:** The blueprint benchmark (Billed: ₹4,00,000, Allowed before sublimit: ₹3,13,750, Disease sublimit: ₹1,60,000, 20% co-pay: ₹32,000, Insurer: ₹1,28,000, Patient: ₹2,72,000) must be directly reproducible by the deterministic calculation engine.
3. **Frontend Independence:** Remove any client-side mathematical fallbacks (e.g. `Math.round(totalBilled * 0.4)`) in `FinancialImpactPage.tsx` so all numbers originate deterministically from the backend.

### B. Policy Truth, Provenance & Unknowns
1. **UNKNOWN != 0:** Ensure non-network co-pay, deductible, and room rent caps that are not explicitly stated in the document are clearly displayed as `Not Specified` or `Unknown`, never assumed as zero.
2. **Explicit Provenance:** All displayed constraints must link to their provenance (`EXTRACTED_POLICY_FACT`, `SYSTEM_ASSUMPTION`, `DATASET_ESTIMATE`, etc.).

### C. Hospital Network Status & Specialty Filtering
1. **Network Semantics:** Use honest classifications: `NETWORK_VERIFIED`, `NETWORK_REFERENCE_MATCH`, `NETWORK_NOT_MATCHED`, `NETWORK_UNKNOWN`. Never claim "cashless confirmed" or "empanelled" without evidence.
2. **Specialty Matching:** Ensure exact filtering pipeline (raw data → normalization → exact match → network → location → ranking) without false substring positives.

### D. UX & Language Polish
1. **Language Safety:** Remove clinical or guaranteed claims ("guaranteed", "approved", "doctor recommended", "best hospital").
2. **Remove AI Theatre:** Remove buzzwords and robot icons where standard deterministic calculations are performed.
3. **State Consistency:** Ensure dynamic room switching (e.g. ₹8,000 to ₹3,200) automatically recalculates all dependent shares and potential savings across all pages.

---

## 5. Current Demo Flow Assessment
The demo flow is structurally sound:
1. `LandingPage`: "Understand your insurance before the hospital bill does" -> Launch Demo Policy.
2. `PolicyXRayPage`: Inspect constraints, room rent limit (₹5,000/day), co-pay (0% network), source provenance.
3. `FinancialImpactPage`: Input room tariff, simulate proportionate deduction and out-of-pocket exposure.
4. `HospitalDiscoveryPage`: Filter by Bengaluru + HDFC ERGO + Neurology, evaluate Policy Fit Scores.
5. `HospitalComparisonPage`: Side-by-side trade-offs between hospitals.
6. `RoomComparisonPage`: Select cheaper room, see dynamic savings.
7. `CareJourneyPage`: Pre-admission questions, TPA checklist, discharge reconciliation.
8. `WhatToVerifyPage`: Specific questions to ask TPA and hospital billing desk.
