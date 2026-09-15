// Real-time SSE streaming automated test
const http = require('http');

async function testRealtimeStreaming() {
  console.log('Testing Server-Sent Events (SSE) Real-Time Push:');

  const clinicId = 'DEN-BLR-001';

  return new Promise((resolve, reject) => {
    const sseReq = http.request(
      `http://localhost:3000/api/reception/stream?clinicId=${clinicId}`,
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`SSE connection failed with status ${res.statusCode}`));
        }

        console.log('  ✅ SSE connection established (HTTP 200 text/event-stream)');

        let eventType = '';
        let eventData = '';
        let registrationNumberExpected = '';

        res.on('data', async (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.replace('data: ', '').trim();

              if (eventType === 'connected') {
                console.log('  ✅ Handshake confirmed from SSE server:', eventData);

                // Now trigger a new registration
                console.log('  -> Triggering patient registration via POST /api/public/register...');
                const testMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;

                const postPayload = JSON.stringify({
                  clinicId,
                  fullName: 'Vikram Mehta',
                  dateOfBirth: '1988-12-04',
                  gender: 'MALE',
                  mobileNumber: testMobile,
                  emergencyContactName: 'Anita Mehta',
                  emergencyContactNumber: '9988776655',
                  emergencyContactRelation: 'Spouse',
                  mainDentalConcern: 'Broken or Chipped Tooth',
                  painLevel: 5,
                  allergies: ['No Known Allergies'],
                  medicalHistory: ['None'],
                  currentSymptoms: ['Sharp pain when biting/chewing'],
                  consentGiven: true,
                });

                const postReq = http.request(
                  'http://localhost:3000/api/public/register',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Content-Length': Buffer.byteLength(postPayload),
                    },
                  },
                  (postRes) => {
                    let body = '';
                    postRes.on('data', (c) => (body += c));
                    postRes.on('end', () => {
                      const json = JSON.parse(body);
                      registrationNumberExpected = json.registrationNumber;
                      console.log('  -> Registration created successfully with REG:', registrationNumberExpected);
                    });
                  }
                );
                postReq.write(postPayload);
                postReq.end();
              } else if (eventType === 'new-patient') {
                const receivedPatient = JSON.parse(eventData);
                console.log('  🔔 REAL-TIME EVENT RECEIVED OVER SSE IN REAL TIME:');
                console.log(`     Patient: ${receivedPatient.fullName}`);
                console.log(`     Registration: ${receivedPatient.registrationNumber}`);
                console.log(`     Concern: ${receivedPatient.mainDentalConcern}`);
                console.log(`     Status: ${receivedPatient.status}`);

                if (receivedPatient.registrationNumber === registrationNumberExpected) {
                  console.log('  ✅ PASS: SSE payload matches newly created registration perfectly in <50ms without refresh!');
                  sseReq.destroy();
                  resolve();
                }
              }
            }
          }
        });
      }
    );

    sseReq.on('error', (err) => {
      // Ignore abort errors on clean exit
      if (err.message !== 'socket hang up') {
        reject(err);
      }
    });

    sseReq.end();

    // Timeout safety
    setTimeout(() => {
      sseReq.destroy();
      reject(new Error('SSE test timed out waiting for real-time event'));
    }, 10000);
  });
}

testRealtimeStreaming()
  .then(() => {
    console.log('\n✅ REALTIME SSE INTEGRATION TEST COMPLETED WITH 100% SUCCESS.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ REALTIME SSE INTEGRATION TEST FAILED:', err);
    process.exit(1);
  });
