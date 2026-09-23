import React from 'react';
import { Shield } from 'lucide-react';

interface NavbarProps {
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoHome }) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-logo" onClick={onGoHome}>
          <div className="brand-icon">
            <Shield size={20} strokeWidth={2.4} />
          </div>
          <div className="brand-name">
            Sehat<span>Sure</span>
          </div>
        </div>
        <div className="nav-badge">
          Decision Support
        </div>
      </div>
    </header>
  );
};
