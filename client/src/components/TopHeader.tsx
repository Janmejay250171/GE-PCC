import React from 'react';
import { Upload, RotateCcw } from 'lucide-react';
import { PolicyDocument } from '../types/policy';

interface TopHeaderProps {
  title: string;
  subtitle: string;
  policy: PolicyDocument | null;
  onUploadClick: () => void;
  onResetPolicy: () => void;
  onSwitchDemo?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  policy,
  onUploadClick,
  onResetPolicy
}) => {
  return (
    <header className="main-top-header">
      <div className="top-header-title-group">
        <h1 className="top-header-heading">{title}</h1>
        <p className="top-header-subheading">{subtitle}</p>
      </div>

      <div className="top-header-actions">
        {policy && (
          <div
            className={`demo-mode-badge ${policy._id?.includes('demo') ? '' : 'uploaded-mode-badge'}`}
            title={policy._id?.includes('demo') ? 'Running with verified sample benchmark policy' : 'Running with parsed custom uploaded document'}
            style={policy._id?.includes('demo') ? {} : { background: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8' }}
          >
            <span
              className="demo-dot"
              style={policy._id?.includes('demo') ? {} : { background: '#2563EB' }}
            />
            <span className="demo-text">
              {policy._id?.includes('demo') ? 'Demo Mode' : 'Uploaded Policy'}
            </span>
          </div>
        )}

        <div className="top-header-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onUploadClick}
            title="Upload custom policy PDF"
          >
            <Upload size={14} />
            <span>Upload Policy</span>
          </button>
          {policy && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onResetPolicy}
              title="Reset to home / switch policy"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div
          className="top-user-avatar"
          title="Active Session: Amit Verma (Policyholder)"
        >
          <span>A</span>
        </div>
      </div>
    </header>
  );
};
