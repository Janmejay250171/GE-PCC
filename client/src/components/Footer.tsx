import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p className="footer-disclaimer">
        <strong>Disclaimer:</strong> SehatSure is an insurance-aware healthcare decision-support platform that helps users understand policy-sensitive financial exposure before treatment. It provides estimates and decision support, not guaranteed insurance coverage, live hospital quotations, or claim approval.
      </p>
      <p className="footer-disclaimer" style={{ marginTop: '0.4rem', fontSize: '0.75rem', opacity: 0.85 }}>
        <strong>Reference Cost Dataset:</strong> Static prototype reference data (date not specified by source). Hospital tariffs and bill estimates are modeled reference baselines and not live hospital quotations.
      </p>
    </footer>
  );
};
