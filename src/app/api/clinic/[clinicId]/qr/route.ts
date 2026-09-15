import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateQRPngDataUrl, generateQRSvgString, getRegistrationUrl } from '@/lib/qr';

export async function GET(
  req: NextRequest,
  { params }: { params: { clinicId: string } }
) {
  try {
    const { clinicId } = params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format'); // 'png', 'svg', or json default

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic || !clinic.isActive) {
      return NextResponse.json(
        { success: false, error: 'Clinic not found or inactive.' },
        { status: 404 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const registrationUrl = getRegistrationUrl(clinicId, baseUrl);

    if (format === 'svg') {
      const svg = await generateQRSvgString(registrationUrl);
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `inline; filename="clinic-${clinicId}-qr.svg"`,
        },
      });
    }

    const pngDataUrl = await generateQRPngDataUrl(registrationUrl, { width: 512 });

    if (format === 'png') {
      const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="clinic-${clinicId}-qr.png"`,
        },
      });
    }

    const svgString = await generateQRSvgString(registrationUrl);

    return NextResponse.json({
      success: true,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
      },
      registrationUrl,
      qrPngDataUrl: pngDataUrl,
      qrSvgString: svgString,
    });
  } catch (error) {
    console.error('Error generating clinic QR:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate QR code.' },
      { status: 500 }
    );
  }
}
