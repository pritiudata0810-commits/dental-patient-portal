import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NewPatientRegistrationSchema, sanitizeText } from '@/lib/validations';
import { calculateAgeInIST } from '@/lib/timezone';
import { checkRateLimit } from '@/lib/rateLimit';

// Generates unique human-readable registration ID: REG-YYYY-XXXXX
function generateRegistrationNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `REG-${year}-${randomPart}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Basic IP rate limiting to prevent automated spam
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const rateCheck = checkRateLimit(`reg:${ip}`, 30, 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    // 2. Parse JSON body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload received.' },
        { status: 400 }
      );
    }

    // 3. Strict schema validation
    const validationResult = NewPatientRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      // Get first human-friendly error message
      const firstErrorMessage =
        Object.values(fieldErrors).flat()[0] || 'Please check your inputs.';

      return NextResponse.json(
        {
          success: false,
          error: firstErrorMessage,
          fieldErrors,
        },
        { status: 422 }
      );
    }

    const data = validationResult.data;

    // 4. Duplicate Submission Protection (Backend & Database Level)
    // Check 4A: Exact idempotency key match (handles retry, double-click, browser refresh)
    const existingByIdempotency = await db.patientRegistration.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (existingByIdempotency) {
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          registrationNumber: existingByIdempotency.registrationNumber,
          message: 'Your registration has already been submitted successfully.',
        },
        { status: 200 }
      );
    }

    // Check 4B: Accidental resubmission guard (same 10-digit mobile + DOB + name within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDuplicate = await db.patientRegistration.findFirst({
      where: {
        mobileNumber: data.mobileNumber,
        dateOfBirth: data.dateOfBirth,
        fullName: {
          equals: data.fullName,
        },
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          registrationNumber: recentDuplicate.registrationNumber,
          message: 'Your registration has already been submitted successfully.',
        },
        { status: 200 }
      );
    }

    // 5. Server-side age calculation in Asia/Kolkata (IST)
    const calculatedAge = calculateAgeInIST(data.dateOfBirth);
    if (calculatedAge === null || calculatedAge < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid date of birth.',
        },
        { status: 422 }
      );
    }

    // 6. Generate collision-free registration number
    let registrationNumber = generateRegistrationNumber();
    let collisionCheck = await db.patientRegistration.findUnique({
      where: { registrationNumber },
    });
    while (collisionCheck) {
      registrationNumber = generateRegistrationNumber();
      collisionCheck = await db.patientRegistration.findUnique({
        where: { registrationNumber },
      });
    }

    // 7. Atomic database save
    const newRecord = await db.patientRegistration.create({
      data: {
        registrationNumber,
        idempotencyKey: data.idempotencyKey,
        fullName: sanitizeText(data.fullName),
        mobileNumber: sanitizeText(data.mobileNumber),
        dateOfBirth: data.dateOfBirth,
        age: calculatedAge,
        gender: data.gender,
        email: data.email ? sanitizeText(data.email) : null,
        address: data.address ? sanitizeText(data.address) : null,
        status: 'REGISTERED',
      },
    });

    // 8. Return clean success response (zero leaks of internal IDs or private records)
    return NextResponse.json(
      {
        success: true,
        alreadySubmitted: false,
        registrationNumber: newRecord.registrationNumber,
        submittedAt: newRecord.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to submit your registration right now. Please try again.',
      },
      { status: 500 }
    );
  }
}
