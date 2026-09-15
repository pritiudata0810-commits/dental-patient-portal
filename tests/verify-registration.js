const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to calculate age in Asia/Kolkata
function calculateAgeInIST(dobString, referenceDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobString.trim());
  if (!match) return null;
  const birthYear = parseInt(match[1], 10);
  const birthMonth = parseInt(match[2], 10);
  const birthDay = parseInt(match[3], 10);

  const date = referenceDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  let curYear = 0, curMonth = 0, curDay = 0;
  for (const part of parts) {
    if (part.type === 'year') curYear = parseInt(part.value, 10);
    if (part.type === 'month') curMonth = parseInt(part.value, 10);
    if (part.type === 'day') curDay = parseInt(part.value, 10);
  }

  let age = curYear - birthYear;
  if (curMonth < birthMonth || (curMonth === birthMonth && curDay < birthDay)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

async function runTests() {
  console.log('=== STARTING PATIENT REGISTRATION SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Asia/Kolkata Timezone Age Calculation (Prompt's exact test cases)
  console.log('--- Test Suite 1: Asia/Kolkata IST Age Calculation ---');
  // DOB: 15 September 2000
  // On 13 September 2026: Age = 25
  // On 15 September 2026: Age = 26
  const dobTest = '2000-09-15';
  const testDateBefore = new Date('2026-09-13T10:00:00+05:30');
  const testDateOn = new Date('2026-09-15T10:00:00+05:30');
  const testDateAfter = new Date('2026-09-16T10:00:00+05:30');

  const ageBefore = calculateAgeInIST(dobTest, testDateBefore);
  const ageOn = calculateAgeInIST(dobTest, testDateOn);
  const ageAfter = calculateAgeInIST(dobTest, testDateAfter);

  assert(ageBefore === 25, `DOB 2000-09-15 on 2026-09-13 (IST) must be 25 (got ${ageBefore})`);
  assert(ageOn === 26, `DOB 2000-09-15 on 2026-09-15 (IST) must be 26 (got ${ageOn})`);
  assert(ageAfter === 26, `DOB 2000-09-15 on 2026-09-16 (IST) must be 26 (got ${ageAfter})`);

  // TEST 2: API End-to-End Registration (Hitting running server or Direct DB)
  const baseUrl = 'http://127.0.0.1:3000';
  console.log('\n--- Test Suite 2: API Route Validation & Submissions ---');

  try {
    // 2A. Missing Name
    const resNoName = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-1',
        fullName: '',
        mobileNumber: '9876543210',
        dateOfBirth: '2000-01-15',
        gender: 'Male',
      }),
    });
    const dataNoName = await resNoName.json();
    assert(resNoName.status === 422, 'Missing name returns 422');
    assert(dataNoName.error.includes('Please enter your name'), 'Returns "Please enter your name."');

    // 2B. Invalid Mobile Number (9 digits)
    const resShortMobile = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-2',
        fullName: 'Rahul Sharma',
        mobileNumber: '987654321', // 9 digits
        dateOfBirth: '2000-01-15',
        gender: 'Male',
      }),
    });
    const dataShortMobile = await resShortMobile.json();
    assert(resShortMobile.status === 422, '9-digit mobile returns 422');
    assert(dataShortMobile.error.includes('Please enter a valid 10-digit mobile number'), 'Returns "Please enter a valid 10-digit mobile number."');

    // 2C. Invalid Mobile Number (Contains letters)
    const resLetterMobile = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-3',
        fullName: 'Rahul Sharma',
        mobileNumber: '98765ABCD0',
        dateOfBirth: '2000-01-15',
        gender: 'Male',
      }),
    });
    const dataLetterMobile = await resLetterMobile.json();
    assert(resLetterMobile.status === 422, 'Letters in mobile returns 422');

    // 2D. Invalid Gender
    const resBadGender = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-4',
        fullName: 'Rahul Sharma',
        mobileNumber: '9876543210',
        dateOfBirth: '2000-01-15',
        gender: 'InvalidGenderOption',
      }),
    });
    assert(resBadGender.status === 422, 'Invalid gender option rejected');

    // 2E. Valid Registration for Patient A (Only specified fields, optional address empty)
    const keyPatientA = 'idemp_patA_' + Date.now();
    const resValidA = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientA,
        fullName: 'Aarav Mehta',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
        email: 'aarav@example.com',
      }),
    });
    const dataValidA = await resValidA.json();
    assert(resValidA.status === 201, 'Patient A registration returns 201 Created');
    assert(dataValidA.success === true, 'Success flag is true');
    assert(dataValidA.alreadySubmitted === false, 'alreadySubmitted is false');
    assert(typeof dataValidA.registrationNumber === 'string' && dataValidA.registrationNumber.startsWith('REG-'), `Registration number assigned: ${dataValidA.registrationNumber}`);

    // Verify Patient A in SQLite Database
    const dbRecordA = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientA },
    });
    assert(dbRecordA !== null, 'Patient A record saved in SQLite database');
    assert(dbRecordA.fullName === 'Aarav Mehta', 'Full name correctly stored in DB');
    assert(dbRecordA.mobileNumber === '9876543210', 'Mobile number correctly stored');
    assert(dbRecordA.gender === 'Male', 'Gender correctly stored');
    assert(dbRecordA.age > 0, `Calculated age stored in DB: ${dbRecordA.age}`);

    // 2F. Accidental Duplicate Submission with SAME Idempotency Key (e.g. double click or network retry)
    const resDuplicateKey = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientA, // Same key!
        fullName: 'Aarav Mehta',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
        email: 'aarav@example.com',
      }),
    });
    const dataDuplicateKey = await resDuplicateKey.json();
    assert(resDuplicateKey.status === 200, 'Duplicate request returns 200 OK');
    assert(dataDuplicateKey.alreadySubmitted === true, 'alreadySubmitted is true for duplicate key');
    assert(dataDuplicateKey.registrationNumber === dataValidA.registrationNumber, 'Returns existing registration reference number');

    // Verify NO duplicate record was created
    const countA = await prisma.patientRegistration.count({
      where: { mobileNumber: '9876543210', fullName: 'Aarav Mehta' },
    });
    assert(countA === 1, `Exact database count for Patient A remains 1 (got ${countA})`);

    // 2G. Accidental Resubmission within 5 Minutes (timing duplicate guard)
    const resDuplicateDetails = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'idemp_different_key_' + Date.now(),
        fullName: 'Aarav Mehta',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
      }),
    });
    const dataDuplicateDetails = await resDuplicateDetails.json();
    assert(dataDuplicateDetails.alreadySubmitted === true, 'Timing window catches accidental duplicate submission');

    // 2H. Intentional New Patient on Same Phone / Device (e.g., family member: "Register Another Patient")
    const keyPatientB = 'idemp_patB_' + Date.now();
    const resValidB = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientB,
        fullName: 'Pooja Mehta',
        mobileNumber: '9876543210', // Same phone number!
        dateOfBirth: '1998-11-12',
        gender: 'Female',
        address: 'Flat 401, Lotus Heights, Bengaluru',
      }),
    });
    const dataValidB = await resValidB.json();
    assert(resValidB.status === 201, 'Patient B (different person on same phone) returns 201 Created');
    assert(dataValidB.alreadySubmitted === false, 'Patient B creates a fresh registration');
    assert(dataValidB.registrationNumber !== dataValidA.registrationNumber, 'Patient B receives a distinct unique registration number');

    // Verify Patient B in Database
    const dbRecordB = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientB },
    });
    assert(dbRecordB !== null, 'Patient B record saved separately in DB');
    assert(dbRecordB.fullName === 'Pooja Mehta', 'Patient B name matches');
    assert(dbRecordB.gender === 'Female', 'Patient B gender matches');
    assert(dbRecordB.address === 'Flat 401, Lotus Heights, Bengaluru', 'Patient B address saved');

    // Verify Patient A is still intact
    const dbRecordARecheck = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientA },
    });
    assert(dbRecordARecheck !== null && dbRecordARecheck.fullName === 'Aarav Mehta', 'Patient A record remains safely preserved');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
