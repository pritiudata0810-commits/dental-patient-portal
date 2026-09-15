import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId');

    const whereClinic = clinicId ? { clinicId } : {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalToday, newPending, duplicates, inConsultation] = await Promise.all([
      db.patientRegistration.count({
        where: { ...whereClinic, createdAt: { gte: startOfToday } },
      }),
      db.patientRegistration.count({
        where: { ...whereClinic, status: 'NEW' },
      }),
      db.patientRegistration.count({
        where: { ...whereClinic, isPotentialDuplicate: true },
      }),
      db.patientRegistration.count({
        where: { ...whereClinic, status: 'IN_CONSULTATION' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalToday,
        newPending,
        duplicates,
        inConsultation,
      },
    });
  } catch (error) {
    console.error('Error fetching receptionist stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receptionist stats.' },
      { status: 500 }
    );
  }
}
