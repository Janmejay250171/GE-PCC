import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  Upload,
  DollarSign,
  Building2,
  CheckCircle2,
  Loader2,
  Compass,
  FileText,
  Activity,
  FileSearch
} from 'lucide-react';

interface LandingPageProps {
  onTryDemo: () => void;
  onUploadClick: () => void;
  onLearnMore?: () => void;
  isLoadingDemo?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onTryDemo,
  onUploadClick,
  isLoadingDemo = false
}) => {
  const [activeNav, setActiveNav] = useState<'home' | 'how-it-works' | 'features' | 'about'>('home');

  const scrollTo = (id: string, navKey: 'home' | 'how-it-works' | 'features' | 'about') => {
    setActiveNav(navKey);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 70;
      const elementTop = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({ top: elementTop, behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-wrap" id="home">
      {/* Top Navigation Bar */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand" onClick={() => scrollTo('home', 'home')} role="button" tabIndex={0}>
            <div className="landing-brand-icon">
              <Shield size={20} strokeWidth={2.4} />
            </div>
            <span className="landing-brand-text">
              Sehat<span>Sure</span>
            </span>
          </div>

          <nav className="landing-nav-links">
            <button
              type="button"
              className={`landing-link ${activeNav === 'home' ? 'active' : ''}`}
              onClick={() => scrollTo('home', 'home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`landing-link ${activeNav === 'how-it-works' ? 'active' : ''}`}
              onClick={() => scrollTo('how-it-works', 'how-it-works')}
            >
              How it works
            </button>
            <button
              type="button"
              className={`landing-link ${activeNav === 'features' ? 'active' : ''}`}
              onClick={() => scrollTo('features', 'features')}
            >
              Features
            </button>
            <button
              type="button"
              className={`landing-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => scrollTo('about', 'about')}
            >
              About
            </button>
          </nav>

          <div className="landing-nav-action">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onTryDemo}
              disabled={isLoadingDemo}
            >
              {isLoadingDemo ? 'Loading...' : 'Try Demo Policy'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-hero-grid">
          {/* Left Column: Core Value Proposition */}
          <div className="landing-hero-content">
            <h1 className="landing-hero-heading">
              Understand your insurance before the hospital bill does.
            </h1>
            <p className="landing-hero-subhead">
              Health insurance policies contain intricate room rent caps, co-pays, and waiting periods. SehatSure models these rules and compares empanelled hospitals before planned admission — eliminating costly surprises.
            </p>

            <div className="landing-hero-ctas">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={onTryDemo}
                disabled={isLoadingDemo}
              >
                {isLoadingDemo ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading Demo...</span>
                  </>
                ) : (
                  <>
                    <span>Try Demo Policy</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={onUploadClick}
              >
                <Upload size={17} />
                <span>Upload Your Policy</span>
              </button>
            </div>

            {/* Quiet Supporting Trust Points */}
            <div className="landing-hero-trust-row" aria-label="Product Principles">
              <span className="trust-inline-item">
                <CheckCircle2 size={13} className="text-muted" /> Non-binding decision support
              </span>
              <span className="trust-sep">•</span>
              <span className="trust-inline-item">
                <CheckCircle2 size={13} className="text-muted" /> Ground-truth policy extraction
              </span>
              <span className="trust-sep">•</span>
              <span className="trust-inline-item">
                <CheckCircle2 size={13} className="text-muted" /> Zero medical diagnosis
              </span>
            </div>
          </div>

          {/* Right Column: Coherent Demo Policy Preview Surface */}
          <div className="landing-hero-visual-card">
            <div className="hero-product-preview-surface">
              {/* Header */}
              <div className="preview-surface-header">
                <span className="preview-context-tag">DEMO POLICY PREVIEW</span>
                <h3 className="preview-policy-name">Corporate Group Health Shield</h3>
                <span className="preview-policy-meta">HDFC ERGO • Seeded Benchmark Schedule</span>
              </div>

              <div className="preview-surface-divider" />

              {/* Specs Table - Clean whitespace and alignment without nested cards */}
              <div className="preview-specs-table">
                <div className="preview-spec-row">
                  <div className="spec-data-col">
                    <span className="spec-label">Sum Insured</span>
                    <span className="spec-value">₹5,00,000</span>
                    <span className="spec-note">Base annual cover</span>
                  </div>
                  <div className="spec-data-col">
                    <span className="spec-label">Room Rent Limit</span>
                    <span className="spec-value">₹5,000 / day</span>
                    <span className="spec-note">1% of Sum Insured</span>
                  </div>
                </div>

                <div className="preview-spec-row">
                  <div className="spec-data-col">
                    <span className="spec-label">Network Co-pay</span>
                    <span className="spec-value text-success">0% on Network*</span>
                    <span className="spec-note">Empanelled network only</span>
                  </div>
                  <div className="spec-data-col">
                    <span className="spec-label">Waiting Periods</span>
                    <span className="spec-value">0 Days (PED)</span>
                    <span className="spec-note">Maternity: 9 months</span>
                  </div>
                </div>
              </div>

              <div className="preview-surface-divider" />

              {/* Quiet Product Insight */}
              <div className="preview-quiet-insight">
                <p>
                  Room choice directly governs out-of-pocket exposure. Selecting rooms above ₹5,000/day triggers proportionate deduction across associated medical charges.
                </p>
              </div>

              {/* Subdued Exploration Action */}
              <button
                type="button"
                className="preview-explore-action"
                onClick={onTryDemo}
                disabled={isLoadingDemo}
              >
                <span>Explore Policy X-Ray</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Capability Strip (Replaced 4 noisy cards) */}
        <div className="landing-capabilities-strip" role="region" aria-label="Core Capabilities">
          <div className="capability-col" onClick={() => scrollTo('features', 'features')} role="button" tabIndex={0}>
            <span className="capability-index">01 / POLICY</span>
            <h4 className="capability-title">Policy X-Ray</h4>
            <p className="capability-desc">Translates room rent caps, co-pays, and waiting periods into plain numbers with citations.</p>
          </div>

          <div className="capability-col" onClick={() => scrollTo('features', 'features')} role="button" tabIndex={0}>
            <span className="capability-index">02 / SIMULATOR</span>
            <h4 className="capability-title">Financial Impact</h4>
            <p className="capability-desc">Models patient out-of-pocket exposure and proportionate deduction before choosing a room.</p>
          </div>

          <div className="capability-col" onClick={() => scrollTo('features', 'features')} role="button" tabIndex={0}>
            <span className="capability-index">03 / NETWORK</span>
            <h4 className="capability-title">Hospital Matching</h4>
            <p className="capability-desc">Discovers empanelled Bengaluru facilities and compares room tariffs alongside policy fit scores.</p>
          </div>

          <div className="capability-col" onClick={() => scrollTo('features', 'features')} role="button" tabIndex={0}>
            <span className="capability-index">04 / PRE-ADMISSION</span>
            <h4 className="capability-title">What to Verify</h4>
            <p className="capability-desc">Provides actionable checklists and questions to confirm with the hospital TPA desk before planned care.</p>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 2: HOW IT WORKS
          =================================================================== */}
      <section className="landing-section-block" id="how-it-works">
        <div className="section-container">
          <div className="section-header-center">
            <span className="section-badge">How It Works</span>
            <h2 className="section-main-heading">From Fine Print to Financial Clarity in 4 Steps</h2>
            <p className="section-main-subhead">
              Indian health insurance policies contain intricate clauses that directly govern your final hospital bill. SehatSure models these rules before admission.
            </p>
          </div>

          <div className="how-it-works-steps-grid">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-number-pill">01</div>
              <div className="step-icon-wrap">
                <FileText size={22} className="text-primary" />
              </div>
              <h3 className="step-title">Extract Policy Terms</h3>
              <p className="step-desc">
                Upload your policy PDF or select a verified benchmark. SehatSure extracts your Sum Insured, room rent caps (e.g. 1% of SI), ICU ceilings, and co-payment clauses with verifiable clause citations.
              </p>
              <div className="step-checkpoint">
                <CheckCircle2 size={14} className="text-success" />
                <span>Zero guesswork • Verifiable source citations</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div className="step-number-pill">02</div>
              <div className="step-icon-wrap">
                <DollarSign size={22} className="text-primary" />
              </div>
              <h3 className="step-title">Simulate Financial Exposure</h3>
              <p className="step-desc">
                Enter your expected procedure and room tier. The simulator models proportionate deduction rules, showing how an ₹8,000/day Deluxe room triggers deductions across doctor fees and OT charges.
              </p>
              <div className="step-checkpoint">
                <CheckCircle2 size={14} className="text-success" />
                <span>Proportionate deduction modeling</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-number-pill">03</div>
              <div className="step-icon-wrap">
                <Building2 size={22} className="text-primary" />
              </div>
              <h3 className="step-title">Match & Compare Facilities</h3>
              <p className="step-desc">
                Discover hospitals matching your specialty in Bengaluru. Each facility displays its calibrated Policy Fit Score (0–100), reference cashless network status, and indicative procedure cost brackets.
              </p>
              <div className="step-checkpoint">
                <CheckCircle2 size={14} className="text-success" />
                <span>950+ Bengaluru facilities (240+ reference network matches)</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="step-card">
              <div className="step-number-pill">04</div>
              <div className="step-icon-wrap">
                <CheckCircle2 size={22} className="text-primary" />
              </div>
              <h3 className="step-title">Verify Before Admission</h3>
              <p className="step-desc">
                Never get surprised at the discharge counter. SehatSure equips you with actionable questions to ask the hospital TPA desk regarding pre-authorization, package inclusions, and non-payables.
              </p>
              <div className="step-checkpoint">
                <CheckCircle2 size={14} className="text-success" />
                <span>Pre-admission checklist & questions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 3: FEATURES IN DEPTH
          =================================================================== */}
      <section className="landing-section-block bg-subtle" id="features">
        <div className="section-container">
          <div className="section-header-center">
            <span className="section-badge">Core Capabilities</span>
            <h2 className="section-main-heading">Built for Serious Healthcare-Financial Decisions</h2>
            <p className="section-main-subhead">
              Every feature in SehatSure answers four essential questions: Where am I? What am I looking at? Why does this matter? What can I do next?
            </p>
          </div>

          <div className="features-deep-grid">
            {/* Feature 1 */}
            <div className="deep-feature-card">
              <div className="df-top">
                <div className="df-icon-square">
                  <FileSearch size={22} className="text-primary" />
                </div>
                <span className="df-tag">Policy Extraction</span>
              </div>
              <h3 className="df-title">Policy X-Ray</h3>
              <p className="df-desc">
                Breaks down multi-page insurance policy documents into digestible constraints: Room Rent Limits, ICU Limits, Co-pays, Sub-limits, and Waiting Periods.
              </p>
              <ul className="df-bullets">
                <li>Extracts exact daily room caps (e.g. ₹5,000 / day)</li>
                <li>Displays progressive disclosure via "Why this value?"</li>
                <li>Maintains unknown values as "Not Specified in Policy"</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="deep-feature-card">
              <div className="df-top">
                <div className="df-icon-square">
                  <Activity size={22} className="text-primary" />
                </div>
                <span className="df-tag">Cost Modeling</span>
              </div>
              <h3 className="df-title">Financial Impact Simulator</h3>
              <p className="df-desc">
                Interactive 3-column scenario simulator displaying total billed cost, insurer coverage, and estimated patient out-of-pocket exposure with proportional dual-color stacked bars.
              </p>
              <ul className="df-bullets">
                <li>Calculates insurer vs. patient share dynamically</li>
                <li>Simulates room category upgrades & downgrades</li>
                <li>Itemized bill breakdown with consumable audits</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="deep-feature-card">
              <div className="df-top">
                <div className="df-icon-square">
                  <Building2 size={22} className="text-primary" />
                </div>
                <span className="df-tag">Network Matching</span>
              </div>
              <h3 className="df-title">Hospital Matching & Comparison</h3>
              <p className="df-desc">
                Search 950+ hospitals across Bengaluru filtered by specialty (Neurology, Cardiology, Orthopedics) and insurer. Compare facilities side-by-side in a structured comparison matrix.
              </p>
              <ul className="df-bullets">
                <li>Policy Fit Score (e.g. 92/100) reflecting policy synergy</li>
                <li>Network status: Reference match vs. unverified</li>
                <li>Side-by-side tariff and capability comparison</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="deep-feature-card">
              <div className="df-top">
                <div className="df-icon-square">
                  <Compass size={22} className="text-primary" />
                </div>
                <span className="df-tag">Care Guidance</span>
              </div>
              <h3 className="df-title">Room Choice Impact & Care Journey</h3>
              <p className="df-desc">
                Our signature interaction: preview out-of-pocket savings by comparing room categories (Deluxe vs. Standard). Then navigate a 5-stage Care Journey with Pre-Admission checklists.
              </p>
              <ul className="df-bullets">
                <li>Demonstrates modeled reduction in out-of-pocket exposure</li>
                <li>Pre-admission pre-authorization checklist</li>
                <li>Questions to ask the hospital TPA desk before admission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 4: ABOUT SEHATSURE
          =================================================================== */}
      <section className="landing-section-block" id="about">
        <div className="section-container">
          <div className="about-layout-grid">
            <div className="about-left-col">
              <span className="section-badge">About SehatSure</span>
              <h2 className="about-heading">
                Transparent healthcare-financial decision support built on mathematical truth.
              </h2>
              <p className="about-text-lead">
                In India, over 70% of health insurance claim disputes arise from misunderstandings around room rent limits, proportionate deductions, and excluded consumables.
              </p>
              <p className="about-text-sub">
                SehatSure was created for the <strong>Precision Care Challenge 2026</strong> to bridge this gap. We translate complex insurance contracts into transparent, actionable financial projections before the patient enters the hospital.
              </p>

              <div className="about-cta-row">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={onTryDemo}
                  disabled={isLoadingDemo}
                >
                  <span>Experience Interactive Demo</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className="about-right-col">
              <div className="about-pillar-card">
                <div className="pillar-num">01</div>
                <div>
                  <h4 className="pillar-title">Non-Binding Decision Support</h4>
                  <p className="pillar-desc">
                    SehatSure is a decision-support prototype. It does not issue binding claim adjudication or guarantee hospital reimbursement. Final payments are determined exclusively by your insurer and treating facility.
                  </p>
                </div>
              </div>

              <div className="about-pillar-card">
                <div className="pillar-num">02</div>
                <div>
                  <h4 className="pillar-title">Verifiable Policy Provenance</h4>
                  <p className="pillar-desc">
                    Every number shown has an identifiable clause citation, page reference, and mathematical derivation. We never fabricate data or present artificial certainty.
                  </p>
                </div>
              </div>

              <div className="about-pillar-card">
                <div className="pillar-num">03</div>
                <div>
                  <h4 className="pillar-title">Calm, Human-Designed UX</h4>
                  <p className="pillar-desc">
                    No robot graphics, no neon gradients, and no AI marketing gimmicks. Just clean, authoritative information architecture designed for high-stakes healthcare moments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Strip */}
      <footer className="landing-footer-strip">
        <div className="footer-strip-inner">
          <span className="footer-motto">"Informed healthcare decisions for a more secure tomorrow."</span>
          <div className="footer-brand" onClick={() => scrollTo('home', 'home')} role="button" tabIndex={0}>
            <Shield size={16} className="text-primary" />
            <strong>SehatSure</strong>
          </div>
          <div className="footer-links">
            <button type="button" className="footer-link-btn" onClick={() => scrollTo('how-it-works', 'how-it-works')}>
              How it works
            </button>
            <span>•</span>
            <button type="button" className="footer-link-btn" onClick={() => scrollTo('features', 'features')}>
              Features
            </button>
            <span>•</span>
            <button type="button" className="footer-link-btn" onClick={() => scrollTo('about', 'about')}>
              About
            </button>
            <span>•</span>
            <span style={{ color: '#94A3B8' }}>Precision Care Challenge 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
