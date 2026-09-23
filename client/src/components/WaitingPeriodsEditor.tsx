import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WaitingPeriods } from '../types/policy';

interface WaitingPeriodsEditorProps {
  value: WaitingPeriods | null;
  onChange: (val: WaitingPeriods) => void;
  disabled?: boolean;
}

export const WaitingPeriodsEditor: React.FC<WaitingPeriodsEditorProps> = ({
  value,
  onChange,
  disabled
}) => {
  const current = value || { initial: null, preExisting: null, maternity: null, procedures: {} };
  const procedures = current.procedures || {};
  const procEntries = Object.entries(procedures);

  const [newProc, setNewProc] = useState('');
  const [newDuration, setNewDuration] = useState('');

  const updateField = (field: keyof WaitingPeriods, val: any) => {
    onChange({
      ...current,
      [field]: val
    });
  };

  const handleAddProc = () => {
    if (!newProc.trim() || !newDuration.trim()) return;
    onChange({
      ...current,
      procedures: {
        ...procedures,
        [newProc.trim()]: newDuration.trim()
      }
    });
    setNewProc('');
    setNewDuration('');
  };

  const handleRemoveProc = (key: string) => {
    const copy = { ...procedures };
    delete copy[key];
    onChange({
      ...current,
      procedures: copy
    });
  };

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="field-item">
          <label className="field-label">Initial Waiting Period</label>
          <input
            type="text"
            className="field-input"
            value={current.initial ?? ''}
            onChange={(e) => updateField('initial', e.target.value || null)}
            placeholder="e.g. 30 days"
            disabled={disabled}
          />
        </div>

        <div className="field-item">
          <label className="field-label">Pre-existing Diseases</label>
          <input
            type="text"
            className="field-input"
            value={current.preExisting ?? ''}
            onChange={(e) => updateField('preExisting', e.target.value || null)}
            placeholder="e.g. 3 years"
            disabled={disabled}
          />
        </div>

        <div className="field-item">
          <label className="field-label">Maternity Waiting Period</label>
          <input
            type="text"
            className="field-input"
            value={current.maternity ?? ''}
            onChange={(e) => updateField('maternity', e.target.value || null)}
            placeholder="e.g. 9 months / 2 years"
            disabled={disabled}
          />
        </div>
      </div>

      <div>
        <label className="field-label" style={{ marginBottom: '6px' }}>
          Specific Procedure Waiting Periods
        </label>
        {procEntries.length > 0 && (
          <table className="kv-table">
            <thead>
              <tr>
                <th>Procedure</th>
                <th>Waiting Period</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {procEntries.map(([key, dur]) => (
                <tr key={key}>
                  <td>
                    <input
                      type="text"
                      className="field-input"
                      value={key}
                      disabled
                      style={{ background: '#F8FAF9' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="field-input"
                      value={dur}
                      onChange={(e) => {
                        onChange({
                          ...current,
                          procedures: {
                            ...procedures,
                            [key]: e.target.value
                          }
                        });
                      }}
                      disabled={disabled}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-remove-row"
                      onClick={() => handleRemoveProc(key)}
                      disabled={disabled}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!disabled && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="field-input"
              style={{ maxWidth: '220px' }}
              placeholder="Procedure e.g. Joint Replacement"
              value={newProc}
              onChange={(e) => setNewProc(e.target.value)}
            />
            <input
              type="text"
              className="field-input"
              style={{ maxWidth: '160px' }}
              placeholder="Duration e.g. 2 years"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            />
            <button type="button" className="btn-add-row" onClick={handleAddProc} style={{ margin: 0 }}>
              <Plus size={14} /> Add Waiting Period
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
