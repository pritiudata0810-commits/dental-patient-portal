'use client';

import React, { useState, useEffect, useId } from 'react';
import { calculateAgeInIST, getTodayISTDateString } from '@/lib/timezone';
import { GenderOptions } from '@/lib/validations';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';

type PageView = 'form' | 'success' | 'already_submitted' | 'exit';

interface FormData {
  idempotencyKey: string;
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  address: string;
}

// Generate a random client UUIDv4 for idempotency
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getInitialFormData(): FormData {
  return {
    idempotencyKey: generateUUID(),
    fullName: '',
    mobileNumber: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    address: '',
  };
}

export function SinglePatientRegistration() {
  const [view, setView] = useState<PageView>('form');
  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationRef, setRegistrationRef] = useState<string>('');
  const [maxDobDate, setMaxDobDate] = useState<string>('');

  // Set today's date in Asia/Kolkata for the date picker max attribute
  useEffect(() => {
    setMaxDobDate(getTodayISTDateString());
  }, []);

  // Update calculated age dynamically whenever Date of Birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAgeInIST(formData.dateOfBirth);
      setCalculatedAge(age);
    } else {
      setCalculatedAge(null);
    }
  }, [formData.dateOfBirth]);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, up to 10
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobileNumber: rawVal }));
    if (errors.mobileNumber) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.mobileNumber;
        return next;
      });
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Name *
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your name.';
    }

    // 2. Mobile Number *
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number.';
    } else if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number.';
    }

    // 3. Date of Birth *
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Please enter your date of birth.';
    } else {
      const age = calculateAgeInIST(formData.dateOfBirth);
      if (age === null || age < 0) {
        newErrors.dateOfBirth = 'Please enter your date of birth.';
      }
    }

    // 5. Gender *
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender.';
    }

    // 6. Email (Optional)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: formData.idempotencyKey,
          fullName: formData.fullName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(result.error || 'Unable to submit your registration right now. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setRegistrationRef(result.registrationNumber || '');

      // Check if this was an already submitted submission
      if (result.alreadySubmitted) {
        setView('already_submitted');
      } else {
        setView('success');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setServerError('Unable to submit your registration right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register Another Patient: Fresh form, fresh idempotencyKey, clean state
  const handleRegisterAnotherPatient = () => {
    setFormData(getInitialFormData());
    setCalculatedAge(null);
    setErrors({});
    setServerError(null);
    setRegistrationRef('');
    setView('form');
  };

  // Exit: Final thank you screen
  const handleExit = () => {
    setView('exit');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="w-full max-w-lg mx-auto">
        {/* ================= TOP BRANDING HEADER ================= */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-100/90 text-sky-600 shadow-sm mb-3 border border-sky-200/60">
            {/* Small Simple Clean Tooth SVG Logo */}
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C8.5 2 6 4 6 7.5C6 9.5 6.8 11.5 7.2 13.5C7.6 15.5 8 18.5 9 21C9.5 22 10.5 22 11 20.5C11.5 19 11.8 17 12 17C12.2 17 12.5 19 13 20.5C13.5 22 14.5 22 15 21C16 18.5 16.4 15.5 16.8 13.5C17.2 11.5 18 9.5 18 7.5C18 4 15.5 2 12 2ZM10.5 6.5C10.5 5.7 11.2 5 12 5C12.8 5 13.5 5.7 13.5 6.5C13.5 7.3 12.8 8 12 8C11.2 8 10.5 7.3 10.5 6.5Z" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
            Apex Dental Hospital
          </h1>
          <p className="text-sm font-semibold text-sky-700 mt-0.5">
            New Patient Registration
          </p>
        </header>

        {/* ================= VIEW 1: REGISTRATION FORM ================= */}
        {view === 'form' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-dental border border-sky-100">
            {serverError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{serverError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
              {/* Field 1: Name * */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={formData.fullName}
                  disabled={isSubmitting}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/60 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.fullName
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-900'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100 text-slate-900'
                  }`}
                />
                {errors.fullName && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Field 2: Mobile Number * */}
              <div>
                <label
                  htmlFor="mobileNumber"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Mobile Number <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-sm font-semibold">
                    +91
                  </div>
                  <input
                    id="mobileNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={formData.mobileNumber}
                    disabled={isSubmitting}
                    onChange={handleMobileChange}
                    placeholder="10-digit mobile number"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border bg-slate-50/60 text-sm sm:text-base tracking-wider focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.mobileNumber
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-900'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100 text-slate-900'
                    }`}
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.mobileNumber}
                  </p>
                )}
              </div>

              {/* Field 3: Date of Birth * & Field 4: Age */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Date of Birth <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    max={maxDobDate}
                    value={formData.dateOfBirth}
                    disabled={isSubmitting}
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/60 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.dateOfBirth
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-900'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100 text-slate-900'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                {/* Field 4: Age (Auto-calculated, read-only, no *) */}
                <div>
                  <label
                    htmlFor="calculatedAge"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Age
                  </label>
                  <input
                    id="calculatedAge"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={
                      calculatedAge !== null
                        ? `${calculatedAge} ${calculatedAge === 1 ? 'year' : 'years'}`
                        : 'Auto-calculated'
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-600 text-sm sm:text-base font-semibold cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Field 5: Gender * (Only Male, Female, Other) */}
              <div>
                <label
                  htmlFor="gender"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Gender <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  id="gender"
                  value={formData.gender}
                  disabled={isSubmitting}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/60 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.gender
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-900'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100 text-slate-900'
                  }`}
                >
                  <option value="" disabled>
                    Select Gender
                  </option>
                  {GenderOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.gender && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.gender}
                  </p>
                )}
              </div>

              {/* Field 6: Email (Optional) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Email (Optional)
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  disabled={isSubmitting}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="patient@example.com"
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/60 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 text-rose-900'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-100 text-slate-900'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Field 7: Address (Optional) */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Address (Optional)
                </label>
                <textarea
                  id="address"
                  rows={2}
                  value={formData.address}
                  disabled={isSubmitting}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="House/flat number, street, area, city"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:border-sky-500 focus:ring-sky-100 text-slate-900 transition-all resize-none"
                />
              </div>

              {/* Submit Registration Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold text-base shadow-dental transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= VIEW 2: REGISTRATION SUBMITTED SUCCESSFULLY ================= */}
        {view === 'success' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-dental border border-sky-100 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Registration Submitted Successfully!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
                Your details have been submitted successfully.
                <br />
                Please proceed to the reception desk.
              </p>
            </div>

            {registrationRef && (
              <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/80 inline-block px-6">
                <span className="text-xs uppercase font-bold text-sky-700 tracking-wider block">
                  Registration Reference
                </span>
                <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {registrationRef}
                </span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              {/* Primary Button */}
              <button
                type="button"
                onClick={handleRegisterAnotherPatient}
                className="w-full py-3.5 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm sm:text-base shadow-sm transition-all"
              >
                Register Another Patient
              </button>

              {/* Secondary Button */}
              <button
                type="button"
                onClick={handleExit}
                className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW 3: FORM ALREADY SUBMITTED ================= */}
        {view === 'already_submitted' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-dental border border-amber-100 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Form Already Submitted
              </h2>
              <p className="text-sm sm:text-base text-slate-700 font-medium">
                Your registration has already been submitted successfully.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto pt-1">
                If you need any assistance or would like to make any changes, please enquire at the reception desk.
              </p>
            </div>

            {registrationRef && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 inline-block px-6">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider block">
                  Registration Reference
                </span>
                <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                  {registrationRef}
                </span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleRegisterAnotherPatient}
                className="w-full py-3.5 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm sm:text-base shadow-sm transition-all"
              >
                Register Another Patient
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW 4: EXIT / THANK YOU SCREEN ================= */}
        {view === 'exit' && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-dental border border-sky-100 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
              <HeartHandshake className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Thank You
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your registration has been submitted successfully.
                <br />
                Please proceed to the reception desk.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Healthcare Privacy & Security Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400 space-y-1">
        <div className="inline-flex items-center gap-1 text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Patient Privacy &amp; Data Security Protected</span>
        </div>
        <p className="text-[11px]">
          Apex Dental Hospital • Asia/Kolkata Reference Time
        </p>
      </footer>
    </div>
  );
}
