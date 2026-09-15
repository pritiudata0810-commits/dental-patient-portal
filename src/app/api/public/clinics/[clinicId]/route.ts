import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const { clinicId } = params;

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        name: true,
        tagline: true,
        address: true,
        phone: true,
        email: true,
        operatingHours: true,
        isActive: true,
      },
    });

    if (!clinic || !clinic.isActive) {
      return NextResponse.json(
        { success: false, error: 'Clinic not found or inactive.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, clinic });
  } catch (error) {
    console.error('Error fetching public clinic info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load clinic information.' },
      { status: 500 }
    );
  }
}
