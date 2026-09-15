import { EventEmitter } from 'events';

export interface PatientRegistrationEvent {
  type: 'NEW_PATIENT_REGISTERED';
  clinicId: string;
  timestamp: string;
  patient: {
    id: string;
    registrationNumber: string;
    clinicId: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    mobileNumber: string;
    mainDentalConcern: string;
    painLevel: number;
    allergies: string[];
    medicalHistory: string[];
    emergencyContactName: string;
    emergencyContactNumber: string;
    status: string;
    registrationSource: string;
    isPotentialDuplicate: boolean;
    duplicateReason?: string | null;
    createdAt: string;
  };
}

class RealtimeBroker extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  broadcastNewPatient(event: PatientRegistrationEvent) {
    // Broadcast to global channel and clinic-specific channel
    this.emit('patient:all', event);
    this.emit(`patient:${event.clinicId}`, event);
  }

  broadcastStatusChange(clinicId: string, payload: { patientId: string; status: string; updatedAt: string }) {
    this.emit(`status:${clinicId}`, payload);
    this.emit('status:all', payload);
  }
}

const globalForRealtime = globalThis as unknown as {
  realtimeBroker: RealtimeBroker | undefined;
};

export const realtimeBroker = globalForRealtime.realtimeBroker ?? new RealtimeBroker();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeBroker = realtimeBroker;
}
