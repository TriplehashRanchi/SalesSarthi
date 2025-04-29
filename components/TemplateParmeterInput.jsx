'use client';
import React from 'react';
import IconTrashLines from '@/components/icon/icon-trash-lines';

const availableFields = [
  { value: 'full_name',      label: 'Full Name' },
  { value: 'email',          label: 'Email' },
  { value: 'phone_number',   label: 'Phone Number' },
  { value: 'lead_status',    label: 'Lead Status' },
  { value: 'insurance_type', label: 'Insurance Type' },
  { value: 'policy_number',  label: 'Policy Number' },
  { value: 'coverage_amount',label: 'Coverage Amount' },
  { value: 'preferred_plan', label: 'Preferred Plan' }
];

export default function TemplateParameterInput({ param, index, onChange, onRemove }) {

  const handleTypeChange = e => {
    onChange(index, {
      ...param,
      type  : e.target.value,
      field : e.target.value === 'dynamic' ? '' : undefined,
      value : e.target.value === 'fixed'   ? '' : undefined
    });
  };

  return (
    <div className="flex items-center space-x-3 mb-3 p-3 border rounded-md">
      {/* dynamic / fixed selector */}
      <select
        value={param.type}
        onChange={handleTypeChange}
        className="form-select w-1/3"
      >
        <option value="dynamic">Dynamic Field</option>
        <option value="fixed">Fixed Value</option>
      </select>

      {/* field dropdown OR fixed-value input */}
      {param.type === 'dynamic' ? (
        <select
          value={param.field || ''}
          onChange={e => onChange(index, { ...param, field: e.target.value })}
          className="form-select flex-grow"
        >
          <option value="" disabled>Select lead field…</option>
          {availableFields.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          className="form-input flex-grow"
          placeholder="Enter fixed value"
          value={param.value || ''}
          onChange={e => onChange(index, { ...param, value: e.target.value })}
        />
      )}

      {/* remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="btn btn-outline-danger btn-sm p-2"
      >
        <IconTrashLines className="w-4 h-4" />
      </button>
    </div>
  );
}
