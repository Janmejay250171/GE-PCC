import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { InsuredPerson } from '../types/policy';

interface InsuredPersonsEditorProps {
  persons: InsuredPerson[];
  onChange: (updated: InsuredPerson[]) => void;
  disabled?: boolean;
}

export const InsuredPersonsEditor: React.FC<InsuredPersonsEditorProps> = ({
  persons,
  onChange,
  disabled
}) => {
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newRelation, setNewRelation] = useState('self');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const ageNum = parseInt(newAge, 10);
    if (isNaN(ageNum) || ageNum < 0) return;

    onChange([
      ...persons,
      {
        name: newName.trim(),
        age: ageNum,
        relation: newRelation.trim()
      }
    ]);
    setNewName('');
    setNewAge('');
    setNewRelation('self');
  };

  const handleRemove = (index: number) => {
    const next = [...persons];
    next.splice(index, 1);
    onChange(next);
  };

  const handleUpdate = (index: number, field: keyof InsuredPerson, val: any) => {
    const next = [...persons];
    next[index] = {
      ...next[index],
      [field]: val
    };
    onChange(next);
  };

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      {persons.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)', fontStyle: 'italic', padding: '6px 0' }}>
          No insured individuals listed. Add family members below.
        </div>
      ) : (
        <table className="kv-table">
          <thead>
            <tr>
              <th>Insured Name</th>
              <th>Age</th>
              <th>Relation</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {persons.map((person, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className="field-input"
                    value={person.name}
                    onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                    disabled={disabled}
                    placeholder="Full name"
                  />
                </td>
                <td style={{ maxWidth: '100px' }}>
                  <input
                    type="number"
                    className="field-input"
                    value={person.age}
                    onChange={(e) => handleUpdate(idx, 'age', parseInt(e.target.value, 10) || 0)}
                    disabled={disabled}
                    min={0}
                    max={120}
                  />
                </td>
                <td style={{ maxWidth: '140px' }}>
                  <select
                    className="field-select"
                    value={person.relation}
                    onChange={(e) => handleUpdate(idx, 'relation', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="self">Self</option>
                    <option value="spouse">Spouse</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="parent-in-law">Parent-in-law</option>
                    <option value="other">Other</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn-remove-row"
                    onClick={() => handleRemove(idx)}
                    disabled={disabled}
                    title="Remove person"
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
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="field-input"
            style={{ maxWidth: '200px' }}
            placeholder="Name e.g. R. Sharma"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            className="field-input"
            style={{ maxWidth: '90px' }}
            placeholder="Age"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            min={0}
            max={120}
          />
          <select
            className="field-select"
            style={{ maxWidth: '140px' }}
            value={newRelation}
            onChange={(e) => setNewRelation(e.target.value)}
          >
            <option value="self">Self</option>
            <option value="spouse">Spouse</option>
            <option value="son">Son</option>
            <option value="daughter">Daughter</option>
            <option value="father">Father</option>
            <option value="mother">Mother</option>
            <option value="parent-in-law">Parent-in-law</option>
            <option value="other">Other</option>
          </select>
          <button type="button" className="btn-add-row" onClick={handleAdd} style={{ margin: 0 }}>
            <Plus size={14} /> Add Person
          </button>
        </div>
      )}
    </div>
  );
};
