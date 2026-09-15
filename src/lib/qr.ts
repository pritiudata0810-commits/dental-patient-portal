import QRCode from 'qrcode';

export interface QROptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const DEFAULT_OPTIONS: QROptions = {
  width: 512,
  margin: 2,
  color: {
    dark: '#0369a1', // Deep dental ocean blue
    light: '#ffffff',
  },
};

/**
 * Builds the exact public registration URL for a given clinic.
 * Encodes ONLY this URL into the QR code.
 */
export function getRegistrationUrl(clinicId: string, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return `${origin}/clinic/${clinicId}/register`;
}

/**
 * Generates a PNG Data URL of the QR code.
 */
export async function generateQRPngDataUrl(
  url: string,
  options?: QROptions
): Promise<string> {
  return QRCode.toDataURL(url, {
    ...DEFAULT_OPTIONS,
    ...options,
    errorCorrectionLevel: 'H', // High error tolerance for counter standees
  });
}

/**
 * Generates an SVG string of the QR code.
 */
export async function generateQRSvgString(
  url: string,
  options?: QROptions
): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    ...DEFAULT_OPTIONS,
    ...options,
    errorCorrectionLevel: 'H',
  });
}
