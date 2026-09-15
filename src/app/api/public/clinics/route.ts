import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clinics = await db.clinic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        tagline: true,
        address: true,
        phone: true,
        email: true,
        operatingHours: true,
      },
    });

    return NextResponse.json({ success: true, clinics });
  } catch (error) {
    console.error('Error listing public clinics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load clinics.' },
      { status: 500 }
    );
  }
}
