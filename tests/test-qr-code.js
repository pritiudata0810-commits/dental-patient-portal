const fs = require('fs');
const path = require('path');
const { PNG } = require('C:/Users/Shree/.gemini/antigravity/brain/d7444fa7-8162-41a5-a736-f143501c9c1a/scratch/node_modules/pngjs');
const jsQR = require('C:/Users/Shree/.gemini/antigravity/brain/d7444fa7-8162-41a5-a736-f143501c9c1a/scratch/node_modules/jsqr');

const TARGET_URL = 'https://dental-patient-portal-flax.vercel.app/register';
const QR_DIR = 'C:/Users/Shree/.gemini/antigravity/scratch/dental-patient-portal/hospital-qr';

console.log('================================================================');
console.log('  QR CODE DECODING & SCAN VERIFICATION TEST');
console.log('  Expected Target URL:', TARGET_URL);
console.log('================================================================\n');

let allPassed = true;

function testFile(filePath, label) {
  console.log(`Checking ${label}:`);
  console.log(`File path: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`  [FAIL] File does not exist: ${filePath}`);
    allPassed = false;
    return;
  }
  const stat = fs.statSync(filePath);
  console.log(`  File size: ${(stat.size / 1024).toFixed(1)} KB`);

  const buffer = fs.readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  console.log(`  Dimensions: ${png.width} x ${png.height}`);

  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

  if (!decoded) {
    console.error('  [FAIL] jsQR could not detect QR code in full image.');
    allPassed = false;
    return;
  }

  console.log(`  Decoded content: "${decoded.data}"`);

  if (decoded.data === TARGET_URL) {
    console.log(`  [PASS] Exactly matches target destination URL!`);
  } else {
    console.error(`  [FAIL] Decoded content does NOT match! Expected "${TARGET_URL}", got "${decoded.data}"`);
    allPassed = false;
  }
  console.log('');
}

// Test 1: Standalone QR
testFile(path.join(QR_DIR, 'hospital-registration-qr.png'), '1. Standalone High-Resolution QR (hospital-registration-qr.png)');

// Test 2: Hospital Standee Sign (with label & instructions)
testFile(path.join(QR_DIR, 'hospital-standee-sign.png'), '2. Hospital Standee Sign (hospital-standee-sign.png)');

if (allPassed) {
  console.log('================================================================');
  console.log('  ALL QR CODE VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('  100% of tested assets decode to:');
  console.log('  ' + TARGET_URL);
  console.log('================================================================');
} else {
  console.error('VERIFICATION FAILED!');
  process.exit(1);
}
