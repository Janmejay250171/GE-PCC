# SehatSure — Final Data Provenance & Ground Truth Reference
**Platform:** SehatSure Insurance-Aware Healthcare Decision Support System  
**Auditor:** Principal Reliability Engineer & Domain Auditor  
**Date:** September 2026  

---

## 1. Core Principle: Truthful Classification
Every data point displayed in the SehatSure user interface or computed in the backend is strictly tagged with its origin. The platform never silently converts an unknown constraint into zero or presents an assumption as an extracted policy term.

| Provenance Label | Meaning | Example Occurrence |
|---|---|---|
| `EXTRACTED_POLICY_FACT` | Stated explicitly and unambiguously in the uploaded insurance document | Sum Insured: ₹5,00,000, Room rent limit: 1% of SI |
| `DERIVED_POLICY_VALUE` | Mathematically calculated from explicit policy rules | Daily room cap: ₹5,000/day calculated from 1% of ₹5,00,000 |
| `HOSPITAL_DATASET_FACT` | Sourced directly from the 53,022 hospital records | Hospital Name, Address, City, Government vs Private |
| `NETWORK_DATASET_FACT` | Empanelment listing in hospital database matching insurer name/alias | `NETWORK_REFERENCE_MATCH` vs `NETWORK_NOT_MATCHED` |
| `COST_DATASET_ESTIMATE` | Statistical procedure/ward benchmark from reference cost databases | Procedure reference average from `pvt_costs.csv` / `govt_costs.csv` |
| `SYSTEM_ASSUMPTION` | Transparent prototype model baseline clearly labeled to user | 20% doctor fee share, 10% medicine share, 5% non-medical consumable |
| `UNKNOWN` | Not specified in uploaded policy document | Non-network co-pay, unlisted disease sublimits |

---

## 2. Policy Sources & Fixtures

### A. HDFC ERGO My:Health Medisure Classic / Corporate Floater Fixture
- **Source:** IRDAI registered corporate health insurance policy schedule.
- **Sum Insured:** ₹5,00,000 (`EXTRACTED_POLICY_FACT`).
- **Room Rent Limit:** 1% of Sum Insured per day (`EXTRACTED_POLICY_FACT`) → ₹5,00,000 × 1% = **₹5,000/day** (`DERIVED_POLICY_VALUE`).
- **ICU Charges:** No separate sub-limit or cap beyond overall Sum Insured (`EXTRACTED_POLICY_FACT`).
- **Network Co-payment:** **0% on empanelled network hospitals** (`EXTRACTED_POLICY_FACT`).
- **Non-Network Co-payment:** `UNKNOWN` / Not specified in uploaded schedule (`UNKNOWN`). Displays as `"Not specified; confirm with insurer for non-network claims"`.
- **Proportionate Deduction Clause:** Active for room tariff breach (`EXTRACTED_POLICY_FACT`). Applied to associate medical expenses (doctor fees + procedure/surgery).
- **Compulsory Deductible:** ₹0 (`EXTRACTED_POLICY_FACT`).
- **Restoration Benefit:** 100% automatic reinstatement once during policy period (`EXTRACTED_POLICY_FACT`).
- **Waiting Periods:** Initial 0 days, PED 0 days (corporate waiver endorsement), Maternity 9 months (`EXTRACTED_POLICY_FACT`).
- **Ambulance Cover:** ₹2,500 per hospitalization event (`EXTRACTED_POLICY_FACT`).

### B. Star Health Family Health Optima Fixture
- **Source:** Retail individual/floater schedule.
- **Sum Insured:** ₹3,00,000 (`EXTRACTED_POLICY_FACT`).
- **Room Rent Limit:** ₹3,000/day fixed tariff cap (`EXTRACTED_POLICY_FACT`).
- **Network Co-payment:** 10% co-pay on admissible claim (`EXTRACTED_POLICY_FACT`).
- **Sublimits:** Knee replacement capped at ₹1,50,000 per policy year (`EXTRACTED_POLICY_FACT`).

### C. Statutory Scheme Overrides (PM-JAY & ESI)
- **Ayushman Bharat PM-JAY:** Statutory ₹5,00,000 family floater ceiling, 100% cashless, 0% co-pay across empanelled hospitals, zero room rent capping under standard package rates (`SYSTEM_ASSUMPTION` / statutory override).
- **ESI / ESIC Scheme:** Statutory unlimited complete medical cover, 100% cashless across ESIC dispensaries and network tie-ups, zero co-pay (`SYSTEM_ASSUMPTION` / statutory override).

---

## 3. Hospital Reference Dataset
- **Database File:** [hospitals.csv](file:///d:/BTECH/PCC%20HEALTHCARE/bengaluru%20-%20Copy/hospitals.csv)
- **Total Facilities:** **53,022 hospitals** across **21,401 cities and towns**.
- **Nature of Data:** Static prototype reference dataset.
- **Specialty Status:** Marked as `DATASET_LISTED` (listed in reference dataset), never falsely claimed as "independently accredited" or "clinically vetted".
- **Network Status Semantics:**
  - `NETWORK_VERIFIED`: Empanelment confirmed through exact name or verified alias match in dataset.
  - `NETWORK_REFERENCE_MATCH`: Insurer listed in reference hospital record.
  - `NETWORK_NOT_MATCHED`: Insurer not found in hospital's empanelled list.
  - `NETWORK_UNKNOWN` / `UNVERIFIED`: Hospital lacks empanelment list; patient must confirm cashless eligibility.

---

## 4. Cost Benchmarks & Itemized Bill Models
- **Database Files:** [pvt_costs.csv](file:///d:/BTECH/PCC%20HEALTHCARE/bengaluru%20-%20Copy/pvt_costs.csv), [govt_costs.csv](file:///d:/BTECH/PCC%20HEALTHCARE/bengaluru%20-%20Copy/govt_costs.csv)
- **Nature of Data:** Indicative reference estimates derived from city tier, hospital segment, and specialty benchmarks.
- **Explicit Boundary:** These numbers are **cost estimates for decision support**, not hospital quotations or binding bills.
- **Room Tariff Structure:**
  - General Ward: Reference budget rate (~₹2,500/day)
  - Twin Sharing / Semi-Private: Reference median rate (~₹5,000/day)
  - Single Private Room: Reference deluxe rate (~₹8,000–₹12,000/day)
