import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeBroker } from '@/lib/realtime';

const VALID_STATUSES = ['NEW', 'REVIEWED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed values are: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const updated = await db.patientRegistration.update({
      where: { id },
      data: { status },
    });

    realtimeBroker.broadcastStatusChange(updated.clinicId || 'DEN-BLR-001', {
      patientId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`,
      data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt },
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update patient status.' },
      { status: 500 }
    );
  }
}
