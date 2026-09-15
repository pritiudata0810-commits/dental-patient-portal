import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const patient = await db.patientRegistration.findUnique({
      where: { id },
      include: {
        clinic: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient registration record not found.' },
        { status: 404 }
      );
    }

    const parsedPatient = {
      ...patient,
      medicalHistory: JSON.parse(patient.medicalHistory || '[]'),
      allergies: JSON.parse(patient.allergies || '[]'),
      currentSymptoms: JSON.parse(patient.currentSymptoms || '[]'),
    };

    return NextResponse.json({ success: true, data: parsedPatient });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve patient record.' },
      { status: 500 }
    );
  }
}
