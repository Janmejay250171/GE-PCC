# SehatSure — Explicit Platform Boundaries & Limitations
**Date:** September 2026  
**Auditor:** Healthcare Domain Logic & Compliance Auditor  

---

## 1. What SehatSure IS and IS NOT

### SehatSure IS:
- An **insurance-aware decision support system** that reads and extracts policy constraints (room rent caps, proportionate deductions, co-pays, deductibles, and waiting periods).
- A **financial exposure simulator** that projects estimated out-of-pocket costs based on policy terms and hospital room choices.
- A **pre-admission navigator** that provides concrete, contextual questions for policyholders to ask their hospital TPA desk before admission.

### SehatSure IS NOT:
- **NOT Clinical Triage or Diagnosis:** Does not diagnose medical conditions or recommend treatments.
- **NOT Medical Advice:** Never advises patients on medical necessity, surgical procedures, or doctor selection.
- **NOT Hospital Quality or Clinical Safety Ranking:** Does not rate clinical outcomes, infection rates, or doctor competence.
- **NOT an Insurance TPA or Claim Adjudicator:** Does not adjudicate, pre-approve, or guarantee cashless admission or claim reimbursement.
- **NOT Live Hospital Quotations:** Estimated costs are derived from static reference datasets and benchmark models, not real-time hospital billing systems.

---

## 2. Technical and Operational Limitations

### A. Non-Real-Time Datasets
- Hospital empanelment records and procedure cost estimates are loaded from static reference datasets (`hospitals.csv`, `pvt_costs.csv`, `govt_costs.csv`).
- Insurer empanelment networks change dynamically; patients must confirm cashless availability with the hospital TPA desk or insurer toll-free helpline prior to admission.

### B. Policy Scope & Document Types
- The AI extraction engine (Google Gemini) is calibrated for **health insurance policy schedules, policy certificates, and policy wordings**.
- General academic papers, competition problem descriptions, marketing brochures, and hospital discharge summaries do not contain contractual policyholder schedule tables and will yield `null` values for policy terms.

### C. Statutory & Scheme Approvals
- PM-JAY (Ayushman Bharat) and ESI schemes require biometric e-KYC, Aadhaar verification, and formal online pre-authorization from the government portal. SehatSure models statutory policy rules but does not interface directly with the NHA or ESIC portals.

### D. Consumables & Non-Payables
- In actual hospital billing, non-payable medical consumables (gloves, PPE, administrative files, admission kits) vary widely per hospital. SehatSure models an indicative 5% prototype allocation based on standard IRDAI non-payable benchmarking.
