import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Copy,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { clinicId: string };
  searchParams: { reg?: string };
}

export const dynamic = 'force-dynamic';

export default async function RegistrationSuccessPage({ params, searchParams }: Props) {
  const { clinicId } = params;
  const registrationNumber = searchParams.reg;

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
  });

  if (!clinic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 sm:py-10 px-4">
      <div className="max-w-xl mx-auto w-full">
        {/* Main Success Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-dental-lg border border-sky-100 text-center">
          {/* Animated Success Checkmark */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Registration Successful
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Thank You for Registering!
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Your registration has been securely delivered to the reception desk in real time.
          </p>

          {/* Registration Number Badge */}
          <div className="my-6 p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block mb-1">
              Your Registration Number
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-900 tracking-wider font-mono">
              {registrationNumber || 'REG-PENDING'}
            </div>
            <p className="text-[11px] text-sky-700/80 mt-1 font-medium">
              Please present this number at the reception desk
            </p>
          </div>

          {/* Next Steps Guide */}
          <div className="text-left bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600" />
              What to do next
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>
                  <strong className="text-slate-800">Proceed to the reception counter:</strong> Inform the receptionist that you have completed your self check-in.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>
                  <strong className="text-slate-800">Relax in the waiting lounge:</strong> The receptionist will verify your insurance or consultation preference.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-[11px]">
                  3
                </span>
                <span>
                  <strong className="text-slate-800">Doctor will call you shortly:</strong> The dentist already has your health & concern profile ready.
                </span>
              </div>
            </div>
          </div>

          {/* Clinic Information Card */}
          <div className="text-left border-t border-slate-100 pt-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Clinic Details
            </h4>
            <div className="text-sm font-bold text-slate-800">{clinic.name}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <span>{clinic.address}</span>
            </div>
            {clinic.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>{clinic.phone}</span>
              </div>
            )}
            {clinic.operatingHours && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>{clinic.operatingHours}</span>
              </div>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Your medical information is strictly protected and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
