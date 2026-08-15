const foodLabel = (timing) => {
  const map = {
    AFTER: 'After food',
    BEFORE: 'Before food',
    WITH: 'With food',
    ANY: 'Anytime',
  };
  return map[timing] || timing || '—';
};

const safe = (value) => {
  if (value == null || value === '') return '—';
  return String(value);
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export const getPrescriptionDoctorName = (rx) =>
  rx?.doctor?.name || rx?.doctorName || '—';

export const getPrescriptionDiagnoses = (rx) =>
  Array.isArray(rx?.diagnoses) ? rx.diagnoses.filter(Boolean).join(', ') : '—';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildPrescriptionPrintHtml = (rx) => {
  const patient = rx?.patient || {};
  const doctor = rx?.doctor || {};
  const vitals = rx?.vitals || {};
  const medicines = Array.isArray(rx?.medicines) ? [...rx.medicines] : [];
  medicines.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const advice = Array.isArray(rx?.advice) ? rx.advice.filter(Boolean) : [];
  const diagnoses = Array.isArray(rx?.diagnoses) ? rx.diagnoses.filter(Boolean) : [];

  const medRows = medicines
    .map(
      (m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${escapeHtml(m.name)}</strong>
          ${m.contains ? `<div class="muted">Contains: ${escapeHtml(m.contains)}</div>` : ''}
        </td>
        <td>${escapeHtml(m.dosageMnen || '—')}<div class="muted">M-N-E-N</div></td>
        <td>${escapeHtml(m.frequency || '—')}</td>
        <td>${escapeHtml(foodLabel(m.foodTiming))}</td>
        <td>${escapeHtml(m.duration || '—')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(rx?.prescriptionId || 'Prescription')}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 24px; }
    h1 { font-size: 22px; margin: 0; color: #5b21b6; }
    .sub { color: #555; font-size: 12px; margin-top: 4px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
    .row { display: flex; gap: 24px; flex-wrap: wrap; }
    .col { flex: 1; min-width: 200px; }
    .label { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: .04em; }
    .val { font-size: 14px; margin: 2px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e5e5e5; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f3ff; font-size: 11px; text-transform: uppercase; }
    .muted { color: #666; font-size: 11px; }
    .disclaimer { font-size: 11px; color: #444; margin-top: 16px; white-space: pre-wrap; }
    ul { margin: 6px 0; padding-left: 18px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>Docspot Prescription</h1>
  <div class="sub">${escapeHtml(rx?.prescriptionId || '')} · ${escapeHtml(formatDate(rx?.createdAt))} · ${escapeHtml(rx?.status || '')}</div>

  <div class="card row">
    <div class="col">
      <div class="label">Patient</div>
      <div class="val"><strong>${escapeHtml(patient.name || '—')}</strong></div>
      <div class="muted">${escapeHtml(patient.age != null ? `${patient.age} yrs` : '')} ${escapeHtml(patient.gender || '')}</div>
    </div>
    <div class="col">
      <div class="label">Doctor</div>
      <div class="val"><strong>${escapeHtml(doctor.name || '—')}</strong></div>
      <div class="muted">${escapeHtml(doctor.qualifications || '')}</div>
      <div class="muted">${escapeHtml(doctor.specialization || '')}</div>
      <div class="muted">Reg: ${escapeHtml(doctor.registrationNumber || '—')}</div>
    </div>
  </div>

  <div class="card">
    <div class="label">Chief complaints</div>
    <div class="val">${escapeHtml(rx?.chiefComplaints || '—')}</div>
    <div class="label">Drug allergies</div>
    <div class="val">${escapeHtml(rx?.drugAllergies || '—')}</div>
    <div class="label">Diagnoses</div>
    <div class="val">${diagnoses.length ? diagnoses.map(escapeHtml).join(', ') : '—'}</div>
  </div>

  <div class="card">
    <div class="label">Vitals</div>
    <div class="row">
      <div class="col"><div class="muted">BP</div><div>${escapeHtml(vitals.bp)}</div></div>
      <div class="col"><div class="muted">Pulse</div><div>${escapeHtml(vitals.pulse)}</div></div>
      <div class="col"><div class="muted">Temp</div><div>${escapeHtml(vitals.temp)}</div></div>
      <div class="col"><div class="muted">SpO2</div><div>${escapeHtml(vitals.spo2)}</div></div>
      <div class="col"><div class="muted">Weight</div><div>${escapeHtml(vitals.weight)}</div></div>
      <div class="col"><div class="muted">Height</div><div>${escapeHtml(vitals.height)}</div></div>
      <div class="col"><div class="muted">RR</div><div>${escapeHtml(vitals.rr)}</div></div>
    </div>
  </div>

  <div class="card">
    <div class="label">Medicines</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Food</th><th>Duration</th>
        </tr>
      </thead>
      <tbody>${medRows || '<tr><td colspan="6">No medicines</td></tr>'}</tbody>
    </table>
  </div>

  <div class="card">
    <div class="label">Advice</div>
    ${
      advice.length
        ? `<ul>${advice.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
        : `<div class="val">${escapeHtml(rx?.adviceText || '—')}</div>`
    }
    ${rx?.followUpDate || rx?.followUpAfterDays != null
      ? `<div class="muted">Follow-up: ${escapeHtml(rx?.followUpDate || '')} ${
          rx?.followUpAfterDays != null ? `(${escapeHtml(rx.followUpAfterDays)} days)` : ''
        }</div>`
      : ''}
  </div>

  <div class="disclaimer">${escapeHtml(rx?.disclaimerText || 'This prescription is generated for the patient after a teleconsultation. Follow medical advice and seek emergency care if symptoms worsen.')}</div>
</body>
</html>`;
};

export const openPrescriptionPrint = (rx) => {
  const html = buildPrescriptionPrintHtml(rx);
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      /* user can print from the window */
    }
  }, 250);
  return true;
};

export const downloadPrescriptionHtml = (rx) => {
  const html = buildPrescriptionPrintHtml(rx);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe(rx?.prescriptionId || 'prescription').replace(/[^\w.-]/g, '_')}.html`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export { foodLabel, formatDate as formatRxDate };
