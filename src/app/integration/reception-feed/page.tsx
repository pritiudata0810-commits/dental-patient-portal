'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Radio,
  UserCheck,
  Clock,
  Phone,
  AlertTriangle,
  HeartPulse,
  Activity,
  CheckCircle2,
  Code2,
  Sparkles,
  RefreshCw,
  Sliders,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface PatientRecord {
  id: string;
  registrationNumber: string;
  clinicId: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  mobileNumber: string;
  mainDentalConcern: string;
  painLevel: number;
  allergies?: string[];
  medicalHistory?: string[];
  emergencyContactName: string;
  emergencyContactNumber: string;
  status: string;
  registrationSource: string;
  isPotentialDuplicate?: boolean;
  duplicateReason?: string | null;
  createdAt: string;
}

export default function ReceptionLiveFeedPage() {
  const [selectedClinic, setSelectedClinic] = useState<string>('DEN-BLR-001');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [latestNotification, setLatestNotification] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'docs'>('feed');
  const [codeCopied, setCodeCopied] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Synthesize friendly audio chime using Web Audio API (no external MP3 asset needed!)
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pleasant high-low two-tone medical chime (880Hz then 1174Hz)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  // Fetch initial list of patients for selected clinic
  const loadInitialPatients = async (clinicId: string) => {
    try {
      const res = await fetch(`/api/reception/patients?clinicId=${clinicId}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error('Failed to load initial patients:', err);
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    loadInitialPatients(selectedClinic);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `/api/reception/stream?clinicId=${selectedClinic}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('new-patient', (e) => {
      try {
        const newPatient: PatientRecord = JSON.parse(e.data);
        // Play notification sound
        playChime();

        // Update notification banner
        setLatestNotification(
          `🔔 NEW PATIENT: ${newPatient.fullName} (${newPatient.registrationNumber}) just registered!`
        );

        // Prepend to live patients list without manual page refresh
        setPatients((prev) => {
          // Check if already in list to avoid duplicates
          if (prev.some((p) => p.id === newPatient.id)) return prev;
          return [newPatient, ...prev];
        });
      } catch (err) {
        console.error('Error parsing real-time SSE patient:', err);
      }
    });

    es.addEventListener('status-change', (e) => {
      try {
        const data = JSON.parse(e.data);
        setPatients((prev) =>
          prev.map((p) => (p.id === data.patientId ? { ...p, status: data.status } : p))
        );
      } catch (err) {
        console.error('Error parsing real-time status update:', err);
      }
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [selectedClinic]);

  const handleUpdateStatus = async (patientId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/reception/patients/${patientId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, status: newStatus } : p))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const copySnippet = (name: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCodeCopied(name);
    setTimeout(() => setCodeCopied(null), 2500);
  };

  const reactHookCode = `// useDentalRealtime.ts
// Drop this directly into the private Receptionist Dashboard!
import { useEffect, useState } from 'react';

export function useDentalRealtime(clinicId: string) {
  const [newPatients, setNewPatients] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const sse = new EventSource(\`/api/reception/stream?clinicId=\${clinicId}\`);

    sse.addEventListener('connected', () => setIsConnected(true));

    sse.addEventListener('new-patient', (event) => {
      const patient = JSON.parse(event.data);
      console.log('New patient registered via QR:', patient);
      setNewPatients((prev) => [patient, ...prev]);
    });

    sse.onerror = () => setIsConnected(false);

    return () => sse.close();
  }, [clinicId]);

  return { newPatients, isConnected };
}`;

  const vanillaJsCode = `// Vanilla JS / Any Web Framework
const clinicId = 'DEN-BLR-001';
const eventSource = new EventSource(\`/api/reception/stream?clinicId=\${clinicId}\`);

eventSource.addEventListener('new-patient', (e) => {
  const patient = JSON.parse(e.data);
  // 1. Play chime sound
  // 2. Add patient to Receptionist table instantly
  alert(\`New patient: \${patient.fullName} (\${patient.registrationNumber})\`);
});`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-dental border border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                Receptionist Real-Time Integration Inspector
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Live Patient Feed & Reception Event Stream
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">
              This companion tool demonstrates the zero-refresh Server-Sent Events (SSE) pipeline connecting the public QR registration form directly to the private Receptionist Dashboard.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                soundEnabled
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Chime Enabled' : 'Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-600" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            {/* Clinic Filter */}
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="DEN-BLR-001">Apex Smile (DEN-BLR-001)</option>
              <option value="DEN-MUM-002">Pearl White (DEN-MUM-002)</option>
              <option value="DEN-DEL-003">Metro Dental (DEN-DEL-003)</option>
            </select>

            {/* Test Link Button */}
            <a
              href={`/clinic/${selectedClinic}/register`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-xs font-bold hover:from-sky-700 hover:to-cyan-700 shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Submit Test Patient
            </a>
          </div>
        </div>

        {/* Live SSE Status Strip */}
        <div className="bg-white rounded-2xl px-5 py-3 shadow-dental border border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                connected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-800">
              {connected ? 'SSE Stream Live & Listening' : 'Connecting to Stream...'}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-mono">
              /api/reception/stream?clinicId={selectedClinic}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Queue count:</span>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
              {patients.length} records
            </span>
          </div>
        </div>

        {/* Real-time Notification Banner */}
        {latestNotification && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="text-sm font-semibold">{latestNotification}</span>
            </div>
            <button
              onClick={() => setLatestNotification(null)}
              className="text-xs text-sky-100 hover:text-white font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs: Live Feed vs Receptionist Integration Docs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'feed'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Live Patient Queue ({patients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'docs'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Receptionist Dashboard Integration Code
          </button>
        </div>

        {/* TAB 1: LIVE FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {patients.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-sky-100 shadow-dental">
                <Clock className="w-12 h-12 text-sky-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Patient Registrations Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  Open the registration form in another tab or scan the clinic QR code. When a patient clicks submit, their registration will appear here instantaneously in real time without refreshing!
                </p>
                <a
                  href={`/clinic/${selectedClinic}/register`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-md transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Open Public Registration Page
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-5 shadow-dental border border-slate-100 hover:border-sky-200 transition-all space-y-3"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{p.fullName}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'NEW'
                                ? 'bg-sky-100 text-sky-800 animate-pulse'
                                : p.status === 'IN_CONSULTATION'
                                ? 'bg-amber-100 text-amber-800'
                                : p.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-sky-700 mt-0.5">
                          {p.registrationNumber}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(p.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Potential Duplicate Badge */}
                    {p.isPotentialDuplicate && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Possible Duplicate Record:</strong>
                          <p className="text-[11px] mt-0.5 text-amber-800">
                            {p.duplicateReason || 'Same mobile number found on file'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Patient Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Phone
                        </span>
                        <span className="font-semibold">{p.mobileNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Age / Gender
                        </span>
                        <span>
                          {p.gender} • DOB: {p.dateOfBirth}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Main Dental Concern
                        </span>
                        <span className="font-medium text-slate-800">{p.mainDentalConcern}</span>
                      </div>
                    </div>

                    {/* Medical & Allergies tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.allergies &&
                        p.allergies.map((allergy) => (
                          <span
                            key={allergy}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              allergy.includes('No Known')
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            Allergy: {allergy}
                          </span>
                        ))}
                      {p.painLevel > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pain: {p.painLevel}/10
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700">
                        Source: {p.registrationSource}
                      </span>
                    </div>

                    {/* Quick Status Updater */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Change Status:</span>
                      <div className="flex items-center gap-1.5">
                        {p.status !== 'IN_CONSULTATION' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(p.id, 'IN_CONSULTATION')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          >
                            Call into Chair
                          </button>
                        )}
                        {p.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(p.id, 'COMPLETED')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTEGRATION CODE DOCUMENTATION */}
        {activeTab === 'docs' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-dental border border-sky-100 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-sky-600" />
                Connecting the Existing Receptionist Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Provide these code snippets to the developer building the private Receptionist Dashboard. It requires zero server setup and connects in real time without refreshing.
              </p>
            </div>

            {/* React Hook Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Option 1: React / Next.js Hook (Recommended)
                </h3>
                <button
                  type="button"
                  onClick={() => copySnippet('react', reactHookCode)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  {codeCopied === 'react' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {codeCopied === 'react' ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
                {reactHookCode}
              </pre>
            </div>

            {/* Vanilla JS Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Option 2: Vanilla JavaScript / Any UI Framework
                </h3>
                <button
                  type="button"
                  onClick={() => copySnippet('vanilla', vanillaJsCode)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  {codeCopied === 'vanilla' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {codeCopied === 'vanilla' ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
                {vanillaJsCode}
              </pre>
            </div>

            {/* REST API Endpoints Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Receptionist REST API Endpoints
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Method</th>
                      <th className="p-3">Endpoint</th>
                      <th className="p-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-3 font-mono font-bold text-sky-700">GET</td>
                      <td className="p-3 font-mono">/api/reception/stream?clinicId=...</td>
                      <td className="p-3">Realtime Server-Sent Events (SSE) stream for instant push</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-sky-700">GET</td>
                      <td className="p-3 font-mono">/api/reception/patients?clinicId=...&status=NEW</td>
                      <td className="p-3">Fetch paginated list of patients with search & filter</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-sky-700">GET</td>
                      <td className="p-3 font-mono">/api/reception/patients/[id]</td>
                      <td className="p-3">Fetch full medical & dental details of single patient</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-amber-700">PATCH</td>
                      <td className="p-3 font-mono">/api/reception/patients/[id]/status</td>
                      <td className="p-3">Update patient status (REVIEWED, IN_CONSULTATION, COMPLETED)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-bold text-sky-700">GET</td>
                      <td className="p-3 font-mono">/api/reception/stats?clinicId=...</td>
                      <td className="p-3">Daily counts for receptionist counters</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
