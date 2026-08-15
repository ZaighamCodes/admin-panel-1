'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPatientOverview } from '@/store/slices/patientsSlice';
import {
  decodePatientIdParam,
  resolveSafeFileUrl,
  sanitizeDownloadName,
} from '@/services/patientsApi';
import Modal from '@/components/Modal';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Printer,
  RefreshCw,
  Stethoscope,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  foodLabel,
  formatRxDate,
  getPrescriptionDiagnoses,
  getPrescriptionDoctorName,
  openPrescriptionPrint,
} from '@/utils/prescriptionPdf';

const initials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'P';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatBytes = (n) => {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDob = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const isImageType = (fileType, fileName) => {
  const t = String(fileType || '').toLowerCase();
  const n = String(fileName || '').toLowerCase();
  return t.includes('image/') || /\.(png|jpe?g|gif|webp)$/.test(n);
};

const isPdfType = (fileType, fileName) => {
  const t = String(fileType || '').toLowerCase();
  const n = String(fileName || '').toLowerCase();
  return t.includes('pdf') || n.endsWith('.pdf');
};

export default function PatientOverviewPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const patientId = decodePatientIdParam(params?.patientId);

  const { overview } = useAppSelector((state) => state.patients);
  const data = overview.byPatientId[patientId];
  const loading = overview.loading && overview.currentId === patientId && !data;
  const refreshing = overview.loading && !!data;
  const error = overview.error;

  const [tab, setTab] = useState('profile');
  const [docViewer, setDocViewer] = useState(null);
  const [rxViewer, setRxViewer] = useState(null);

  useEffect(() => {
    if (patientId) {
      dispatch(fetchPatientOverview({ patientId }));
    }
  }, [dispatch, patientId]);

  const patient = data?.patient;
  const documents = data?.documents || [];
  const prescriptions = data?.prescriptions || [];
  const documentCount = data?.documentCount ?? documents.length;
  const prescriptionCount = data?.prescriptionCount ?? prescriptions.length;

  const tabs = useMemo(
    () => [
      { id: 'profile', label: 'Profile' },
      { id: 'documents', label: 'Documents', count: documentCount },
      { id: 'prescriptions', label: 'Prescriptions', count: prescriptionCount },
    ],
    [documentCount, prescriptionCount]
  );

  const handleRetry = () => {
    dispatch(fetchPatientOverview({ patientId, force: true }));
  };

  const openDocument = (doc) => {
    const url = resolveSafeFileUrl(doc.fileUrl);
    if (!url) {
      toast.error('This file URL is not allowed');
      return;
    }
    setDocViewer({ ...doc, url });
  };

  const downloadDocument = async (doc) => {
    const url = resolveSafeFileUrl(doc.fileUrl);
    if (!url) {
      toast.error('This file URL is not allowed');
      return;
    }
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (res.status === 404) {
        toast.error('File not found on server');
        return;
      }
      if (!res.ok) {
        toast.error('Unable to download file');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = sanitizeDownloadName(doc.fileName, 'document');
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!patientId) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center">
        <p className="font-semibold text-gray-800">Invalid patient</p>
        <Link href="/patients" className="text-sm text-primary-600 mt-3 inline-block">
          Back to directory
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading patient overview...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-primary-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="font-semibold text-gray-800">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Patients
          </Link>
          <div className="flex items-center gap-4">
            {resolveSafeFileUrl(patient?.profilePictureUrl) ? (
              <img
                src={resolveSafeFileUrl(patient.profilePictureUrl)}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-purple-400 flex items-center justify-center text-white text-xl font-bold">
                {initials(patient?.patientName)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient?.patientName || 'Patient'}
              </h1>
              <p className="font-mono text-sm text-gray-500">{patient?.patientId || patientId}</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {patient?.gender || '—'}
                {patient?.age != null ? ` · ${patient.age} yrs` : ''}
                {patient?.dateOfBirth ? ` · DOB ${formatDob(patient.dateOfBirth)}` : ''}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl p-1.5 inline-flex gap-1 border border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Profile
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-semibold text-gray-900 mt-0.5">{patient?.patientName || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Mobile (patient ID)</dt>
              <dd className="font-mono font-semibold text-gray-900 mt-0.5">
                {patient?.patientId || patientId}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Gender</dt>
              <dd className="font-semibold mt-0.5">{patient?.gender || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Age</dt>
              <dd className="font-semibold mt-0.5">
                {patient?.age != null ? `${patient.age} years` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Date of birth</dt>
              <dd className="font-semibold mt-0.5">{formatDob(patient?.dateOfBirth)}</dd>
            </div>
          </dl>
        </section>
      )}

      {tab === 'documents' && (
        <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary-600" />
            Documents
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No documents uploaded</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id || doc.fileUrl}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isImageType(doc.fileType, doc.fileName) ? (
                      <ImageIcon className="w-5 h-5 text-primary-500 shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {doc.fileType || 'file'} · {formatBytes(doc.fileSize)} ·{' '}
                        {formatRxDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openDocument(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocument(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'prescriptions' && (
        <section className="bg-white rounded-2xl border border-gray-100 soft-shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-600" />
            Prescriptions
          </h2>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No prescriptions</p>
          ) : (
            <ul className="space-y-3">
              {prescriptions.map((rx) => (
                <li
                  key={rx.id || rx.prescriptionId}
                  className="p-4 rounded-xl border border-gray-100 hover:border-primary-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {rx.prescriptionId}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {getPrescriptionDoctorName(rx)} · {formatRxDate(rx.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {getPrescriptionDiagnoses(rx)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {Array.isArray(rx.medicines) ? rx.medicines.length : 0} medicine(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">
                        {rx.status || 'ISSUED'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRxViewer(rx)}
                        className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"
                      >
                        View PDF
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Modal
        isOpen={!!docViewer}
        onClose={() => setDocViewer(null)}
        title={docViewer?.fileName || 'Document'}
        size="xl"
      >
        {docViewer && (
          <div className="space-y-4">
            {isImageType(docViewer.fileType, docViewer.fileName) ? (
              <img
                src={docViewer.url}
                alt=""
                className="max-h-[70vh] mx-auto rounded-lg object-contain"
              />
            ) : isPdfType(docViewer.fileType, docViewer.fileName) ? (
              <iframe
                title="PDF preview"
                src={docViewer.url}
                className="w-full h-[70vh] rounded-lg border border-gray-200"
              />
            ) : (
              <p className="text-sm text-gray-600">
                Preview not available for this file type. Use Download or Open in a new tab.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <a
                href={docViewer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-100 rounded-xl"
              >
                <ExternalLink className="w-4 h-4" />
                New tab
              </a>
              <button
                type="button"
                onClick={() => downloadDocument(docViewer)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!rxViewer}
        onClose={() => setRxViewer(null)}
        title={rxViewer?.prescriptionId || 'Prescription'}
        size="xl"
      >
        {rxViewer && (
          <div className="space-y-5">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const ok = openPrescriptionPrint(rxViewer);
                  if (!ok) toast.error('Allow pop-ups to print or save as PDF');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl"
              >
                <Printer className="w-4 h-4" />
                Print / Save as PDF
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500 font-semibold">Patient</p>
                <p className="font-bold mt-1">{rxViewer.patient?.name || patient?.patientName}</p>
                <p className="text-gray-600">
                  {rxViewer.patient?.age != null ? `${rxViewer.patient.age} yrs` : ''}{' '}
                  {rxViewer.patient?.gender || ''}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500 font-semibold">Doctor</p>
                <p className="font-bold mt-1">{getPrescriptionDoctorName(rxViewer)}</p>
                <p className="text-gray-600">{rxViewer.doctor?.specialization}</p>
                <p className="text-gray-500 text-xs mt-1">
                  Reg {rxViewer.doctor?.registrationNumber || '—'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 font-semibold">Diagnoses</p>
              <p className="mt-1">{getPrescriptionDiagnoses(rxViewer)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Medicines</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-primary-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Medicine</th>
                      <th className="px-3 py-2">M-N-E-N</th>
                      <th className="px-3 py-2">Frequency</th>
                      <th className="px-3 py-2">Food</th>
                      <th className="px-3 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rxViewer.medicines || []).map((m) => (
                      <tr key={m.id || m.name} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <span className="font-medium">{m.name}</span>
                          {m.contains && (
                            <div className="text-xs text-gray-500">{m.contains}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono">{m.dosageMnen || '—'}</td>
                        <td className="px-3 py-2">{m.frequency || '—'}</td>
                        <td className="px-3 py-2">{foodLabel(m.foodTiming)}</td>
                        <td className="px-3 py-2">{m.duration || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-gray-500 whitespace-pre-wrap">
              {rxViewer.disclaimerText ||
                'This prescription is generated for the patient after a teleconsultation.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
