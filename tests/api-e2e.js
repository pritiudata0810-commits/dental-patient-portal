// End-to-end automated test suite for Dental Patient QR Registration System
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING DENTAL PATIENT REGISTRATION E2E TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Clinic Metadata
  console.log('1. Testing Public Clinic Metadata API:');
  const clinicRes = await request('/api/public/clinics/DEN-BLR-001');
  assert(clinicRes.status === 200, 'Clinic DEN-BLR-001 returns HTTP 200');
  assert(clinicRes.data?.clinic?.name?.includes('Apex Smile'), 'Clinic name is Apex Smile Dental Care');
  assert(clinicRes.data?.clinic?.id === 'DEN-BLR-001', 'Clinic ID matches');

  // TEST 2: Clinic QR Code Generation API
  console.log('\n2. Testing Clinic QR Code API:');
  const qrRes = await request('/api/clinic/DEN-BLR-001/qr');
  assert(qrRes.status === 200, 'QR endpoint returns HTTP 200');
  assert(qrRes.data?.qrPngDataUrl?.startsWith('data:image/png;base64,'), 'QR returns valid PNG Data URL');
  assert(qrRes.data?.registrationUrl?.includes('/clinic/DEN-BLR-001/register'), 'QR URL targets /clinic/DEN-BLR-001/register strictly');

  // TEST 3: Validation - Reject Incomplete Submission
  console.log('\n3. Testing Validation (Missing required fields):');
  const invalidRes = await request('/api/public/register', {
    method: 'POST',
    body: JSON.stringify({
      clinicId: 'DEN-BLR-001',
      fullName: 'J', // too short
      // missing DOB, gender, mobile, consent
    }),
  });
  assert(invalidRes.status === 422, 'Incomplete payload rejected with HTTP 422');
  assert(invalidRes.data?.details?.fullName !== undefined, 'Validation identifies short full name');
  assert(invalidRes.data?.details?.mobileNumber !== undefined, 'Validation identifies missing mobile number');

  // TEST 4: Validation - Reject Invalid Clinic ID
  console.log('\n4. Testing Clinic Security (Reject non-existent clinic):');
  const badClinicRes = await request('/api/public/register', {
    method: 'POST',
    body: JSON.stringify({
      clinicId: 'DEN-NON-EXISTENT',
      fullName: 'Test Patient',
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      mobileNumber: '9876543210',
      emergencyContactName: 'Test Contact',
      emergencyContactNumber: '9876543211',
      emergencyContactRelation: 'Spouse',
      mainDentalConcern: 'Routine Cleaning',
      consentGiven: true,
    }),
  });
  assert(badClinicRes.status === 404, 'Non-existent clinic rejected with HTTP 404');

  // TEST 5: Successful Patient Registration
  console.log('\n5. Testing Valid Patient Registration:');
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const validPayload = {
    clinicId: 'DEN-BLR-001',
    fullName: 'Priya Sharma',
    dateOfBirth: '1995-08-20',
    gender: 'FEMALE',
    mobileNumber: testPhone,
    email: 'priya.sharma@example.com',
    address: '142, 5th Cross, Indiranagar, Bengaluru',
    emergencyContactName: 'Rahul Sharma',
    emergencyContactNumber: '9811223344',
    emergencyContactRelation: 'Spouse',
    medicalHistory: ['Asthma / Respiratory Issue'],
    allergies: ['Penicillin / Amoxicillin'],
    currentMedications: 'Inhaler as needed',
    mainDentalConcern: 'Severe Toothache / Sudden Pain',
    painLevel: 7,
    currentSymptoms: ['Sharp pain when biting/chewing', 'Sensitivity to cold drinks/food'],
    consentGiven: true,
  };

  const regRes = await request('/api/public/register', {
    method: 'POST',
    body: JSON.stringify(validPayload),
  });

  assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
  assert(regRes.data?.success === true, 'Success flag is true');
  assert(regRes.data?.registrationNumber?.startsWith('REG-'), 'Registration number generated in format REG-YYYY-XXXX');
  const regNumber = regRes.data?.registrationNumber;
  console.log(`     Assigned Registration Number: ${regNumber}`);

  // TEST 6: Duplicate Submission Detection
  console.log('\n6. Testing Duplicate Submission Handling:');
  // Attempt to submit identical registration within 1 second
  const dupRes = await request('/api/public/register', {
    method: 'POST',
    body: JSON.stringify(validPayload),
  });
  assert(dupRes.status === 200, 'Duplicate submission within short window returns HTTP 200 confirmation');
  assert(dupRes.data?.isRecentResubmission === true, 'Flagged as recent resubmission to prevent duplicate record');
  assert(dupRes.data?.registrationNumber === regNumber, 'Returns existing registration number seamlessly');

  // TEST 7: Receptionist API Retrieval
  console.log('\n7. Testing Receptionist Patient Queue Retrieval:');
  const listRes = await request(`/api/reception/patients?clinicId=DEN-BLR-001&search=${encodeURIComponent('Priya Sharma')}`);
  assert(listRes.status === 200, 'Receptionist patients endpoint returns HTTP 200');
  const foundPatient = listRes.data?.data?.find(p => p.registrationNumber === regNumber);
  assert(foundPatient !== undefined, 'Newly registered patient is in receptionist queue');
  assert(foundPatient?.status === 'NEW', 'Initial patient status is strictly "NEW"');
  assert(foundPatient?.registrationSource === 'QR / PUBLIC REGISTRATION', 'Source is "QR / PUBLIC REGISTRATION"');
  assert(foundPatient?.painLevel === 7, 'Pain level preserved correctly');
  assert(foundPatient?.allergies?.includes('Penicillin / Amoxicillin'), 'Allergies parsed and preserved');

  // TEST 8: Receptionist Status Transition
  console.log('\n8. Testing Receptionist Status Update:');
  if (foundPatient) {
    const statusRes = await request(`/api/reception/patients/${foundPatient.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_CONSULTATION' }),
    });
    assert(statusRes.status === 200, 'Status updated to IN_CONSULTATION successfully');

    // Verify update
    const verifyRes = await request(`/api/reception/patients/${foundPatient.id}`);
    assert(verifyRes.data?.data?.status === 'IN_CONSULTATION', 'Patient status verified as IN_CONSULTATION');
  }

  // TEST 9: Receptionist Stats Endpoint
  console.log('\n9. Testing Receptionist Dashboard Stats:');
  const statsRes = await request('/api/reception/stats?clinicId=DEN-BLR-001');
  assert(statsRes.status === 200, 'Stats endpoint returns HTTP 200');
  assert(typeof statsRes.data?.stats?.totalToday === 'number', 'Total today is a numeric count');
  assert(typeof statsRes.data?.stats?.newPending === 'number', 'New pending count is returned');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
