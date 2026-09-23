import React from 'react';
import { ChevronRight } from 'lucide-react';
import { DemoPolicyItem } from '../types/policy';

interface DemoPickerProps {
  demos: DemoPolicyItem[];
  onSelectDemo: (key: string) => void;
  disabled?: boolean;
}

export const DemoPicker: React.FC<DemoPickerProps> = ({ demos, onSelectDemo, disabled }) => {
  const getBadgeClass = (policyType: string) => {
    switch (policyType) {
      case 'private':
        return 'badge-retail';
      case 'corporate':
        return 'badge-corporate';
      case 'pmjay':
        return 'badge-govt';
      case 'esi':
        return 'badge-esi';
      default:
        return 'badge-retail';
    }
  };

  return (
    <div>
      <div className="demo-divider">
        <span>Or explore with a realistic Indian policy</span>
      </div>

      <div className="demo-grid">
        {demos.map((demo) => (
          <div
            key={demo.key}
            className="demo-card"
            onClick={() => !disabled && onSelectDemo(demo.key)}
          >
            <div>
              <span className={`demo-card-badge ${getBadgeClass(demo.policyType)}`}>
                {demo.badge || demo.policyType}
              </span>
              <h3 className="demo-card-title">{demo.title}</h3>
              <p className="demo-card-desc">{demo.description}</p>
            </div>
            <div className="demo-card-cta">
              Load this policy <ChevronRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
