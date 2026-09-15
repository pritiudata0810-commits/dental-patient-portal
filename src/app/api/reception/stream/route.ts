import { NextRequest } from 'next/server';
import { realtimeBroker, PatientRegistrationEvent } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  const encoder = new TextEncoder();

  let isClosed = false;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial Handshake Message
      const handshake = `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        clinicId: clinicId || 'all',
        connectedAt: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(handshake));

      // 2. Listener for new patient registrations
      const onNewPatient = (event: PatientRegistrationEvent) => {
        if (isClosed) return;
        try {
          const payload = `event: new-patient\ndata: ${JSON.stringify(event.patient)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('Error sending SSE patient event:', err);
        }
      };

      // 3. Listener for status changes
      const onStatusChange = (data: { patientId: string; status: string; updatedAt: string }) => {
        if (isClosed) return;
        try {
          const payload = `event: status-change\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('Error sending SSE status event:', err);
        }
      };

      // Subscribe to appropriate channel
      const patientChannel = clinicId ? `patient:${clinicId}` : 'patient:all';
      const statusChannel = clinicId ? `status:${clinicId}` : 'status:all';

      realtimeBroker.on(patientChannel, onNewPatient);
      realtimeBroker.on(statusChannel, onStatusChange);

      // 4. Keep-Alive Heartbeat every 15s to prevent connection drop
      heartbeatInterval = setInterval(() => {
        if (isClosed) return;
        try {
          const ping = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          // Connection closed
          cleanup();
        }
      }, 15000);

      // 5. Cleanup on abort
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        realtimeBroker.off(patientChannel, onNewPatient);
        realtimeBroker.off(statusChannel, onStatusChange);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      isClosed = true;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering if behind reverse proxy
    },
  });
}
