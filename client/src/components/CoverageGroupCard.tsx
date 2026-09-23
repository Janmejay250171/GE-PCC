import React, { ReactNode } from 'react';

interface CoverageGroupCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const CoverageGroupCard: React.FC<CoverageGroupCardProps> = ({ title, icon, children }) => {
  return (
    <section className="coverage-group-card">
      <div className="group-card-header">
        <div className="group-card-title-wrap">
          {icon && <div className="group-icon">{icon}</div>}
          <h2 className="group-card-title">{title}</h2>
        </div>
      </div>
      <div className="fields-grid">{children}</div>
    </section>
  );
};
