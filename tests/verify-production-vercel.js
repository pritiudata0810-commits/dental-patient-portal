const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRODUCTION_BASE_URL = 'https://dental-patient-portal-flax.vercel.app';

async function runProductionTests() {
  console.log(`\n===============================================================`);
  console.log(`  VERCEL PRODUCTION END-TO-END VERIFICATION SUITE`);
  console.log(`  Testing Target: ${PRODUCTION_BASE_URL}`);
  console.log(`===============================================================\n`);

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

  try {
    // -------------------------------------------------------------
    // TEST 1: Public Webpage Accessibility over HTTPS
    // -------------------------------------------------------------
    console.log('--- Test 1: Public Webpage Accessibility ---');
    const pageRes = await fetch(`${PRODUCTION_BASE_URL}/register`);
    const pageHtml = await pageRes.text();

    assert(pageRes.status === 200, `Production /register responds with HTTP 200`);
    assert(pageHtml.includes('Apex Dental Hospital'), `HTML contains hospital name "Apex Dental Hospital"`);
    assert(pageHtml.includes('New Patient Registration'), `HTML contains "New Patient Registration"`);
    assert(pageHtml.includes('fullName'), `HTML contains "fullName" input`);
    assert(pageHtml.includes('mobileNumber'), `HTML contains "mobileNumber" input`);
    assert(pageHtml.includes('dateOfBirth'), `HTML contains "dateOfBirth" input`);
    assert(pageHtml.includes('calculatedAge'), `HTML contains "calculatedAge" field`);
    assert(pageHtml.includes('gender'), `HTML contains "gender" select`);
    assert(pageHtml.includes('email'), `HTML contains "email" field`);
    assert(pageHtml.includes('address'), `HTML contains "address" field`);
    assert(pageHtml.includes('Submit Registration'), `HTML contains "Submit Registration" button`);

    // -------------------------------------------------------------
    // TEST 2: Validation Errors on Production API
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Production Server-Side Validations ---');

    // 2A. Missing name
    const resNoName = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-1',
        fullName: '',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
      }),
    });
    const dataNoName = await resNoName.json();
    assert(resNoName.status === 422, 'Missing name rejected with 422');
    assert(dataNoName.error.includes('Please enter your name'), 'Returns "Please enter your name."');

    // 2B. 9-digit mobile
    const resShortMobile = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-2',
        fullName: 'Test Patient',
        mobileNumber: '987654321', // 9 digits
        dateOfBirth: '1995-05-20',
        gender: 'Male',
      }),
    });
    const dataShortMobile = await resShortMobile.json();
    assert(resShortMobile.status === 422, '9-digit mobile rejected with 422');
    assert(dataShortMobile.error.includes('Please enter a valid 10-digit mobile number'), 'Returns "Please enter a valid 10-digit mobile number."');

    // 2C. 11-digit mobile
    const resLongMobile = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-3',
        fullName: 'Test Patient',
        mobileNumber: '98765432101', // 11 digits
        dateOfBirth: '1995-05-20',
        gender: 'Male',
      }),
    });
    assert(resLongMobile.status === 422, '11-digit mobile rejected with 422');

    // 2D. Letters in mobile
    const resLetterMobile = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-4',
        fullName: 'Test Patient',
        mobileNumber: '98765ABCD0',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
      }),
    });
    assert(resLetterMobile.status === 422, 'Letters in mobile rejected with 422');

    // 2E. Invalid gender
    const resBadGender = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-5',
        fullName: 'Test Patient',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'OtherGenderOption',
      }),
    });
    assert(resBadGender.status === 422, 'Invalid gender rejected with 422');

    // 2F. Invalid email
    const resBadEmail = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'val-key-6',
        fullName: 'Test Patient',
        mobileNumber: '9876543210',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
        email: 'invalid-email-string',
      }),
    });
    assert(resBadEmail.status === 422, 'Invalid email format rejected with 422');

    // -------------------------------------------------------------
    // TEST 3: Live Patient Registration on Vercel Production
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Live Patient Registration (Patient A) ---');
    const keyPatientA = 'vercel_prod_' + Date.now() + '_patA';
    const resPatientA = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientA,
        fullName: 'Aarav Mehta',
        mobileNumber: '9876500111',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
        email: 'aarav.mehta@example.com',
        address: '100ft Road, Indiranagar, Bengaluru',
      }),
    });
    const dataPatientA = await resPatientA.json();
    assert(resPatientA.status === 201, `Patient A submission returned HTTP 201 Created`);
    assert(dataPatientA.success === true, `Response success is true`);
    assert(dataPatientA.alreadySubmitted === false, `alreadySubmitted is false`);
    assert(typeof dataPatientA.registrationNumber === 'string' && dataPatientA.registrationNumber.startsWith('REG-'), `Assigned registration number: ${dataPatientA.registrationNumber}`);

    // Verify Patient A record in persistent cloud PostgreSQL (Neon)
    const dbRecordA = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientA },
    });
    assert(dbRecordA !== null, 'Patient A record saved in persistent cloud PostgreSQL');
    assert(dbRecordA.fullName === 'Aarav Mehta', `Patient A name saved: ${dbRecordA.fullName}`);
    assert(dbRecordA.mobileNumber === '9876500111', `Patient A mobile saved: ${dbRecordA.mobileNumber}`);
    assert(dbRecordA.gender === 'Male', `Patient A gender saved: ${dbRecordA.gender}`);
    assert(dbRecordA.age === 31, `Patient A calculated age in IST saved: ${dbRecordA.age}`);
    assert(dbRecordA.status === 'REGISTERED', `Patient A status: ${dbRecordA.status}`);

    // -------------------------------------------------------------
    // TEST 4: Duplicate Submission Protection (Same Idempotency Key)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Duplicate Submission Protection ---');
    const resDuplicateA = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientA, // Same key!
        fullName: 'Aarav Mehta',
        mobileNumber: '9876500111',
        dateOfBirth: '1995-05-20',
        gender: 'Male',
        email: 'aarav.mehta@example.com',
        address: '100ft Road, Indiranagar, Bengaluru',
      }),
    });
    const dataDuplicateA = await resDuplicateA.json();
    assert(resDuplicateA.status === 200, `Duplicate submission returns HTTP 200 OK`);
    assert(dataDuplicateA.alreadySubmitted === true, `alreadySubmitted is true for duplicate submission`);
    assert(dataDuplicateA.registrationNumber === dataPatientA.registrationNumber, `Returns original registration number ${dataDuplicateA.registrationNumber}`);

    // Verify NO duplicate record was created in the database
    const countA = await prisma.patientRegistration.count({
      where: { idempotencyKey: keyPatientA },
    });
    assert(countA === 1, `Exact database count for Patient A remains 1 (no duplicate record)`);

    // -------------------------------------------------------------
    // TEST 5: Same Phone / Device Multiple Patients (Patient B)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Same Phone, Multiple Patients ("Register Another Patient") ---');
    const keyPatientB = 'vercel_prod_' + Date.now() + '_patB';
    const resPatientB = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientB,
        fullName: 'Pooja Mehta',
        mobileNumber: '9876500111', // Same phone number as Patient A!
        dateOfBirth: '1998-11-12',
        gender: 'Female',
        address: 'Flat 401, Lotus Heights, Bengaluru',
      }),
    });
    const dataPatientB = await resPatientB.json();
    assert(resPatientB.status === 201, `Patient B (same phone) returned HTTP 201 Created`);
    assert(dataPatientB.alreadySubmitted === false, `Patient B creates a fresh separate registration`);
    assert(dataPatientB.registrationNumber !== dataPatientA.registrationNumber, `Patient B gets unique registration number: ${dataPatientB.registrationNumber}`);

    // Verify Patient B in persistent cloud PostgreSQL
    const dbRecordB = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientB },
    });
    assert(dbRecordB !== null, 'Patient B record saved separately in persistent cloud PostgreSQL');
    assert(dbRecordB.fullName === 'Pooja Mehta', `Patient B name saved: ${dbRecordB.fullName}`);
    assert(dbRecordB.gender === 'Female', `Patient B gender saved: ${dbRecordB.gender}`);
    assert(dbRecordB.age === 27, `Patient B calculated age in IST saved: ${dbRecordB.age}`);

    // Verify Patient A record remains untouched
    const dbRecordACheck = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientA },
    });
    assert(dbRecordACheck !== null && dbRecordACheck.fullName === 'Aarav Mehta', 'Patient A record remains safely preserved');

    // -------------------------------------------------------------
    // TEST 6: Asia/Kolkata Age Calculation Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Asia/Kolkata Age Calculation ---');
    // Test patient born 2000-09-15
    const keyPatientC = 'vercel_prod_' + Date.now() + '_patC';
    const resPatientC = await fetch(`${PRODUCTION_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: keyPatientC,
        fullName: 'Kiran Rao',
        mobileNumber: '9845099887',
        dateOfBirth: '2000-09-15',
        gender: 'Other',
      }),
    });
    const dataPatientC = await resPatientC.json();
    assert(resPatientC.status === 201, `Patient C (DOB 2000-09-15) returns 201 Created`);

    const dbRecordC = await prisma.patientRegistration.findUnique({
      where: { idempotencyKey: keyPatientC },
    });
    assert(dbRecordC !== null, 'Patient C saved in PostgreSQL');
    // On 15 September 2026 IST, 2000-09-15 is exactly age 26 (or 25 before Sept 15)
    assert(dbRecordC.age >= 25 && dbRecordC.age <= 26, `Calculated age is correct in IST: ${dbRecordC.age}`);

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n===============================================================`);
  console.log(`  VERCEL PRODUCTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionTests();
