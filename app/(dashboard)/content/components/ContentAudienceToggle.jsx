'use client';

import { Users, Stethoscope } from 'lucide-react';

export default function ContentAudienceToggle({ value, onChange, patientLabel = 'Patient app', doctorLabel = 'Doctor app' }) {
  return (
    <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/60">
      <button
        type="button"
        onClick={() => onChange('PATIENT')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          value === 'PATIENT'
            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Users className="w-4 h-4" />
        {patientLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange('DOCTOR')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          value === 'DOCTOR'
            ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Stethoscope className="w-4 h-4" />
        {doctorLabel}
      </button>
    </div>
  );
}
