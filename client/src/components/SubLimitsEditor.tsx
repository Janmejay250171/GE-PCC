import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SubLimitsEditorProps {
  subLimits: Record<string, number>;
  onChange: (updated: Record<string, number>) => void;
  disabled?: boolean;
}

export const SubLimitsEditor: React.FC<SubLimitsEditorProps> = ({ subLimits, onChange, disabled }) => {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const entries = Object.entries(subLimits || {});

  const handleAdd = () => {
    if (!newKey.trim() || !newVal) return;
    const valNum = parseFloat(newVal);
    if (isNaN(valNum)) return;

    onChange({
      ...subLimits,
      [newKey.trim()]: valNum
    });
    setNewKey('');
    setNewVal('');
  };

  const handleRemove = (key: string) => {
    const copy = { ...subLimits };
    delete copy[key];
    onChange(copy);
  };

  return (
    <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
      <label className="field-label" style={{ marginBottom: '8px' }}>
        <span>Specific Procedure Sub-limits</span>
      </label>

      {entries.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)', fontStyle: 'italic', padding: '6px 0' }}>
          No specific procedure sub-limits detected or specified.
        </div>
      ) : (
        <table className="kv-table">
          <thead>
            <tr>
              <th>Procedure / Condition</th>
              <th>Cap Amount (₹)</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
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
                    type="number"
                    className="field-input"
                    value={val}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      onChange({
                        ...subLimits,
                        [key]: isNaN(num) ? 0 : num
                      });
                    }}
                    disabled={disabled}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn-remove-row"
                    onClick={() => handleRemove(key)}
                    disabled={disabled}
                    title="Remove sub-limit"
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
            placeholder="Procedure e.g. Cataract"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            type="number"
            className="field-input"
            style={{ maxWidth: '160px' }}
            placeholder="Amount (₹)"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
          />
          <button type="button" className="btn-add-row" onClick={handleAdd} style={{ margin: 0 }}>
            <Plus size={14} /> Add Sub-limit
          </button>
        </div>
      )}
    </div>
  );
};
