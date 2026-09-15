import React from 'react';
import { ShieldCheck, Stethoscope, Phone, MapPin } from 'lucide-react';

interface ClinicHeaderProps {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  clinicId: string;
}

export const ClinicHeader: React.FC<ClinicHeaderProps> = ({
  name = 'Dental Clinic',
  tagline = 'Modern & Gentle Dental Care',
  address,
  phone,
  clinicId,
}) => {
  return (
    <header className="bg-gradient-to-r from-sky-600 via-sky-700 to-cyan-700 text-white shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <Stethoscope className="w-6 h-6 text-sky-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-sky-100 uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Official Patient Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {name}
              </h1>
              {tagline && (
                <p className="text-xs sm:text-sm text-sky-100/90 font-medium mt-0.5">
                  {tagline}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact info strip */}
        {(address || phone) && (
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-sky-100">
            {address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-200 flex-shrink-0" />
                <span className="truncate max-w-xs">{address}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-200 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
