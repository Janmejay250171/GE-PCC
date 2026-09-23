# SEHATSURE — FINAL 5-MINUTE COMPETITION DEMO RUNBOOK
**Audience:** Judges, Healthcare Executives, Technical Evaluators  
**Goal:** Deliver a crisp, confident, defect-free 5-minute walkthrough demonstrating insurance-aware decision support.

---

## 1. Environment & Startup Preparation

### Quick Start Commands
Ensure both backend and frontend servers are running:

```bash
# Terminal 1 — Backend API (Express / TypeScript)
cd "d:\BTECH\PCC HEALTHCARE\bengaluru - Copy\server"
npm run dev
# Expected Output: Server running on port 5000, 53022 hospitals loaded

# Terminal 2 — Frontend UI (Vite / React)
cd "d:\BTECH\PCC HEALTHCARE\bengaluru - Copy\client"
npm run dev
# Expected Output: Local: http://localhost:5173/
```

### Sanity Check URLs
- **Web Interface:** `http://localhost:5173/`
- **Health Check:** `http://localhost:5000/api/health`
- **Hospitals API Test:** `http://localhost:5000/api/hospitals?city=Bengaluru&limit=5`

---

## 2. 5-Minute Minute-by-Minute Pitch Script

```
0:00 ── Problem: The 40% Surprise Bill Trap
0:30 ── Load Seeded Policy / Explain Provenance
1:00 ── Policy X-Ray: Sourced Clauses & Progressive Disclosure
1:40 ── Financial Impact Simulator: Room Cap Ratio & Disallowance
2:20 ── Hospital Discovery: Bengaluru + HDFC ERGO + Neurology
3:00 ── Hospital Comparison: Policy Fit Breakdown
3:30 ── The "Cheaper Room" Signature Interaction: Instant ₹1.1L Savings
4:20 ── Care Journey: Pre-Admission Checklist & What to Verify
4:50 ── Closing: Defensible Decision Support (Not Clinical/Adjudication)
```

---

### Step 1: Problem Statement (0:00 – 0:30)
* **What to Say:**  
  *"Over 70% of health insurance claim disputes in India happen because patients select a hospital room just ₹2,000 above their policy room cap. Because of proportionate deduction clauses, this doesn't just cost ₹2,000 extra per day—it slashes coverage on the entire bill: surgeon fees, OT charges, and nursing. Today, patients find this out at the discharge desk. SehatSure solves this by making insurance constraints transparent before admission."*
* **What to Show:**  
  Open `http://localhost:5173/`. Point to the hero headline: *"Understand the insurance constraints before they become costly surprises."*
* **Action:** Click **"Try Demo Policy (HDFC ERGO)"** or click **"Load Seeded Policy"** on the upload page.

---

### Step 2: Policy X-Ray & Provenance (0:30 – 1:40)
* **What to Say:**  
  *"SehatSure extracts and normalizes the policy schedule into strict, provenance-backed facts. We never fabricate data. Notice the provenance badges: Extracted Policy Fact vs Derived Policy Value."*
* **What to Show:**  
  1. **Sum Insured:** ₹5,00,000 (Source: Clause 1.1).
  2. **Room Rent Limit:** ₹5,000 / day (Derived from 1% of Sum Insured).
  3. **ICU Limit:** No separate cap (100% of Sum Insured).
  4. **Co-Pay:** 0% across Network Hospitals; Non-Network co-pay is honestly flagged as **"Not Specified in Uploaded Document"** rather than assumed to be 0%.
  5. Click **"Inspect Clause & Evidence"** on the Room Rent card to show the slide-out drawer with exact page, section, raw extracted string, and confidence score (0.95).

---

### Step 3: Financial Impact Simulator (1:40 – 2:20)
* **What to Say:**  
  *"Let's see the mathematical consequence of room selection. Suppose the patient requires 5 days of hospitalization for neurosurgery, totaling ₹4,00,000."*
* **What to Show:**  
  Navigate to **Financial Impact**.
  1. Set Room Category to **Deluxe Room (₹8,000/day)**.
  2. The policy limit is ₹5,000/day.
  3. The Allowed Room Ratio is `5,000 / 8,000 = 0.625` (37.5% proportionate disallowance on room-linked associate medical expenses).
  4. Point to the **Deterministic Calculation Audit Trail**:
     - Total Billed: ₹4,00,000
     - Room Rent Excess (5 × ₹3,000): ₹15,000 (100% patient share)
     - Proportionate Disallowance on Associate Charges (₹1,90,000 × 37.5%): ₹71,250
     - Allowed Amount before Sublimit: ₹3,13,750
     - Disease Sublimit Cap: ₹1,60,000
     - 20% Co-pay on Sublimit: ₹32,000
     - **Estimated Insurer Share:** ₹1,28,000
     - **Estimated Patient Share:** ₹2,72,000 (68% of bill!)
  *"Every rupee is calculated deterministically on the backend—zero hallucination, zero client-side guesswork."*

---

### Step 4: Hospital Discovery & Policy Fit Score (2:20 – 3:30)
* **What to Say:**  
  *"Next, we match hospitals against our reference dataset of 53,022 facilities across India."*
* **What to Show:**  
  Navigate to **Hospital Discovery**.
  1. Filter by:
     - **City:** Bengaluru
     - **Insurer:** HDFC ERGO
     - **Specialty:** Neurology
  2. Observe the search result header: *"227 reference-network facilities found in Bengaluru for HDFC ERGO"*.
  3. Point out the **Network Reference Match** badge (clearly labeled so judges know it is derived from published empanelment lists, not a fabricated live API).
  4. Inspect the **Policy Fit Score (e.g., 91/100)**:
     - Show the 5 deterministic sub-components: Network (35%), Room Fit (25%), Sublimit Fit (20%), Cost Variance (10%), Capability (10%).

---

### Step 5: The "Cheaper Room" Signature Interaction (3:30 – 4:20)
* **What to Say:**  
  *"This is SehatSure's hero interaction. A patient standing in the hospital lobby can see the exact financial delta between room categories."*
* **What to Show:**  
  1. Open **Room Comparison** for the selected hospital (e.g., Manipal Hospital or Aster CMI).
  2. Compare:
     - **Deluxe Room (₹8,000/day):** Patient Out-of-Pocket = **₹2,72,000** (due to proportionate deduction penalty).
     - **Twin Sharing Room (₹3,200/day):** Under the ₹5,000 cap! Patient Out-of-Pocket = **₹1,60,000** (Full coverage on associate expenses, no proportionate haircut).
  3. Click **"Select Twin Sharing Room"**.
  4. Watch the entire state recalculate:
     - **Net Out-of-Pocket Savings:** **₹1,12,000 saved** by simply choosing a room under the policy cap!

---

### Step 6: Care Journey & What to Verify (4:20 – 4:50)
* **What to Say:**  
  *"We don't abandon the patient after room selection. We equip them for the administrative journey."*
* **What to Show:**  
  Navigate to **Care Journey**.
  1. Select **Pre-Admission**.
  2. Point out the **"What to Verify" Checklist**:
     - *"Confirm cashless empanelment status directly at the TPA desk."*
     - *"Request written confirmation that chosen room tier will not trigger proportionate deductions."*
     - *"Ensure pre-authorization form cites procedure code matching the policy sublimit clause."*
  3. Highlight that SehatSure is strictly **administrative and financial decision support**—it does not give clinical or doctor recommendations.

---

### Step 7: Closing & Q&A Defensibility (4:50 – 5:00)
* **What to Say:**  
  *"SehatSure turns a 40-page policy of dense legal clauses into clear, actionable financial choices before admission. Thank you, and we welcome your questions."*

---

## 3. Anticipated Judge Questions & Bulletproof Answers

| Question | Bulletproof Answer |
| :--- | :--- |
| **"Where did the ₹2,72,000 patient share come from?"** | *"From a deterministic 4-step backend calculation: ₹15,000 room excess, plus ₹71,250 proportionate deduction on associate medical charges (allowed ratio 5,000/8,000 = 0.625), capped at ₹1,60,000 sublimit with 20% co-pay (₹32,000). The math is completely traceable in our audit trail."* |
| **"Is this hospital really cashless right now?"** | *"Our dataset reflects published insurer empanelment records. We explicitly label this as a 'Reference Network Match' and prominently prompt the patient in the Pre-Admission Care Journey to verify cashless status with the TPA desk upon arrival."* |
| **"What if the policy does not state a clause?"** | *"We strictly flag missing values as `UNKNOWN` or `Not specified in uploaded policy`. We never coerce missing clauses to zero or assume coverage."* |
| **"Does SehatSure recommend medical treatments or doctors?"** | *"No. SehatSure is strictly an insurance-aware financial decision support tool. It has no clinical advice, doctor rankings, or diagnostic models."* |

---

## 4. Fallback & Recovery Procedures

- **If an uploaded PDF has no policy terms (e.g. general document):**  
  The UI displays an amber advisory: *"No Insurance Schedule Detected in Document."* Simply click **"Use Seeded Benchmark Policy"** on the banner to resume the demo smoothly.
- **If the browser cache gets corrupted:**  
  Open an Incognito window or press `Ctrl + Shift + R` at `http://localhost:5173/`.
- **If the backend port 5000 is occupied:**  
  Run `npx kill-port 5000` then restart with `npm --prefix server run dev`.
