import React from 'react';
import {
  Shield,
  FileText,
  DollarSign,
  Building2,
  GitCompare,
  Bed,
  Compass,
  CheckCircle2,
  HelpCircle,
  Home
} from 'lucide-react';

export type AppView =
  | 'landing'
  | 'policy-xray'
  | 'financial-impact'
  | 'find-hospitals'
  | 'hospital-comparison'
  | 'room-comparison'
  | 'care-journey'
  | 'what-to-verify';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  hasPolicy: boolean;
  onHelpClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  hasPolicy,
  onHelpClick
}) => {
  const navItems = [
    { id: 'landing' as AppView, label: 'Home', icon: Home, requiresPolicy: false },
    { id: 'policy-xray' as AppView, label: 'Policy X-Ray', icon: FileText, requiresPolicy: true },
    { id: 'financial-impact' as AppView, label: 'Financial Impact', icon: DollarSign, requiresPolicy: true },
    { id: 'find-hospitals' as AppView, label: 'Find Hospitals', icon: Building2, requiresPolicy: true },
    { id: 'hospital-comparison' as AppView, label: 'Hospital Comparison', icon: GitCompare, requiresPolicy: true },
    { id: 'room-comparison' as AppView, label: 'Room Comparison', icon: Bed, requiresPolicy: true },
    { id: 'care-journey' as AppView, label: 'Care Journey', icon: Compass, requiresPolicy: true },
    { id: 'what-to-verify' as AppView, label: 'What to Verify', icon: CheckCircle2, requiresPolicy: false }
  ];

  return (
    <aside className="app-sidebar" aria-label="Application Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => onNavigate('landing')} role="button" tabIndex={0}>
        <div className="sidebar-brand-icon">
          <Shield size={20} strokeWidth={2.4} />
        </div>
        <div className="sidebar-brand-name">
          Sehat<span>Sure</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = item.requiresPolicy && !hasPolicy;

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => {
                if (!isDisabled) {
                  onNavigate(item.id);
                }
              }}
              disabled={isDisabled}
              title={isDisabled ? 'Select or upload a policy first' : item.label}
            >
              <Icon size={18} className="nav-item-icon" />
              <span className="nav-item-text">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-footer-item"
          onClick={onHelpClick}
          title="Decision Support Guide"
        >
          <HelpCircle size={18} />
          <span>Help & Guide</span>
        </button>
        <div className="sidebar-profile-pill">
          <div className="profile-avatar">A</div>
          <div className="profile-meta">
            <span className="profile-name">Amit Verma</span>
            <span className="profile-sub">Demo Policyholder</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
