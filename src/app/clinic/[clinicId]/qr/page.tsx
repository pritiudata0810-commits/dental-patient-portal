'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  ExternalLink,
  Check,
  Building2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';

interface ClinicData {
  id: string;
  name: string;
  tagline?: string;
  address: string;
  phone: string;
  operatingHours?: string;
}

export default function ClinicQRPage({ params }: { params: { clinicId: string } }) {
  const { clinicId } = params;

  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [allClinics, setAllClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgUrl, setQrSvgUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const registrationUrl = origin
    ? `${origin}/clinic/${clinicId}/register`
    : `http://localhost:3000/clinic/${clinicId}/register`;

  // Fetch current clinic and clinic list
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [currRes, listRes] = await Promise.all([
          fetch(`/api/public/clinics/${clinicId}`),
          fetch('/api/public/clinics'),
        ]);

        const currData = await currRes.json();
        if (currData.success) {
          setClinic(currData.clinic);
        }

        const listData = await listRes.json();
        if (listData.success) {
          setAllClinics(listData.clinics);
        }
      } catch (err) {
        console.error('Failed to load clinic data for QR:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clinicId]);

  // Generate QR Code locally
  useEffect(() => {
    if (!registrationUrl) return;

    async function generateCodes() {
      try {
        // High-res PNG for download & display
        const png = await QRCode.toDataURL(registrationUrl, {
          width: 800,
          margin: 2,
          color: {
            dark: '#0369a1', // Deep dental ocean blue
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        setQrPngUrl(png);

        // Vector SVG
        const svg = await QRCode.toString(registrationUrl, {
          type: 'svg',
          margin: 2,
          color: {
            dark: '#0369a1',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        setQrSvgUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error('Failed generating QR code:', err);
      }
    }

    generateCodes();
  }, [registrationUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPng = () => {
    if (!qrPngUrl) return;
    const a = document.createElement('a');
    a.href = qrPngUrl;
    a.download = `dental-qr-${clinicId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSvg = () => {
    if (!qrSvgUrl) return;
    const a = document.createElement('a');
    a.href = qrSvgUrl;
    a.download = `dental-qr-${clinicId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Navigation & Controls (Hidden in Print) */}
        <div className="no-print bg-white rounded-2xl p-4 sm:p-5 shadow-dental border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Clinic QR Standee & Access Portal
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {clinic ? clinic.name : 'Loading Clinic...'}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Clinic ID: {clinicId}</p>
          </div>

          {/* Switch Clinic Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Switch Clinic:
            </label>
            <select
              value={clinicId}
              onChange={(e) => {
                window.location.href = `/clinic/${e.target.value}/qr`;
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {allClinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons Toolbar (Hidden in Print) */}
        <div className="no-print bg-white rounded-2xl p-4 shadow-dental border border-sky-100 flex flex-wrap items-center justify-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 border border-sky-200 transition-all"
            >
              <Download className="w-4 h-4" /> Download PNG (1024px)
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 border border-sky-200 transition-all"
            >
              <Download className="w-4 h-4" /> Download Vector SVG
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-xs font-bold hover:from-sky-700 hover:to-cyan-700 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Print Desk Standee
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Link!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy URL
                </>
              )}
            </button>
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Test Registration
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE COUNTER STANDEE TEMPLATE (Styled for Desk Display / Acrylic 5x7") */}
        {/* ========================================================================= */}
        <div className="standee-card max-w-md mx-auto bg-white rounded-3xl p-8 shadow-dental-lg border-2 border-sky-200 text-center relative overflow-hidden">
          {/* Subtle light-blue corner aura */}
          <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-sky-100/50 pointer-events-none blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-cyan-100/50 pointer-events-none blur-2xl" />

          {/* Standee Header */}
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Patient Fast Check-In
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {clinic ? clinic.name : 'Dental Clinic'}
            </h2>
            <p className="text-xs font-medium text-sky-700">
              {clinic?.tagline || 'Modern & Pain-Free Dental Care'}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="relative z-10 my-6 p-4 bg-white rounded-2xl border border-sky-100 shadow-md inline-block">
            {qrPngUrl ? (
              <img
                src={qrPngUrl}
                alt={`Registration QR for ${clinic?.name || clinicId}`}
                className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-xl"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                Generating QR Code...
              </div>
            )}
          </div>

          {/* Call to action label */}
          <div className="relative z-10 space-y-3">
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white py-2.5 px-4 rounded-xl shadow-md">
              <p className="text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4" /> Scan with Phone Camera
              </p>
              <p className="text-[11px] text-sky-100 font-medium">
                Skip clipboard paperwork • Register in 2 mins
              </p>
            </div>

            {/* 3 Step Instructions */}
            <div className="text-left bg-sky-50/70 rounded-xl p-3.5 border border-sky-100 text-[11px] text-slate-700 space-y-1.5">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Open your smartphone camera & point at the QR</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Tap the popup link to complete your medical details</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Walk to reception — your chart is already synced!</span>
              </div>
            </div>

            {/* Clinic Details Footer */}
            {clinic && (
              <div className="pt-2 text-[10px] text-slate-500 font-medium border-t border-slate-100">
                <p>{clinic.address}</p>
                <p className="font-semibold text-sky-800 mt-0.5">📞 {clinic.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Security and Configuration Notice (Hidden in Print) */}
        <div className="no-print max-w-md mx-auto bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Info className="w-4 h-4 text-sky-600" />
            <span>QR Code Technical Properties</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong>Strict URL Only:</strong> The QR contains solely{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-sky-800">
              {registrationUrl}
            </code>
            . Zero patient data is encoded in the QR.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Multi-Clinic Routing:</strong> Each clinic has a distinct QR code ensuring new patients are automatically assigned to the correct clinic database partition.
          </p>
        </div>
      </div>
    </div>
  );
}
