import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const whereClause: Record<string, unknown> = {};

    if (clinicId) {
      whereClause.clinicId = clinicId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search } },
        { registrationNumber: { contains: search } },
        { mobileNumber: { contains: search } },
      ];
    }

    const [patients, totalCount] = await Promise.all([
      db.patientRegistration.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          clinic: {
            select: { name: true, id: true },
          },
        },
      }),
      db.patientRegistration.count({ where: whereClause }),
    ]);

    // Parse JSON string fields for client consumption
    const parsedPatients = patients.map((p) => ({
      ...p,
      medicalHistory: JSON.parse(p.medicalHistory || '[]'),
      allergies: JSON.parse(p.allergies || '[]'),
      currentSymptoms: JSON.parse(p.currentSymptoms || '[]'),
    }));

    return NextResponse.json({
      success: true,
      data: parsedPatients,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching receptionist patient list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients.' },
      { status: 500 }
    );
  }
}
