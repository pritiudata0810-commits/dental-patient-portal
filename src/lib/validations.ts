import { z } from 'zod';
import { calculateAgeInIST } from './timezone';

export const GenderOptions = ['Male', 'Female', 'Other'] as const;

export const GenderEnum = z.enum(GenderOptions, {
  errorMap: () => ({ message: 'Please select your gender.' }),
});

/**
 * Strict schema for New Patient Registration.
 * Only the 7 specified patient fields + client-side idempotency key.
 */
export const NewPatientRegistrationSchema = z.object({
  idempotencyKey: z
    .string()
    .min(1, 'Idempotency key is required to protect against duplicate submissions'),
  fullName: z
    .string({ required_error: 'Please enter your name.' })
    .trim()
    .min(1, 'Please enter your name.')
    .max(100, 'Name cannot exceed 100 characters'),
  mobileNumber: z
    .string({ required_error: 'Please enter a valid 10-digit mobile number.' })
    .trim()
    // Exactly 10 digits, valid Indian mobile number starting with 6-9
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number.'),
  dateOfBirth: z
    .string({ required_error: 'Please enter your date of birth.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter your date of birth.')
    .refine((dob) => {
      const age = calculateAgeInIST(dob);
      return age !== null && age >= 0 && age <= 130;
    }, 'Please enter a valid date of birth.'),
  gender: GenderEnum,
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.length > 0 ? val : null)),
  address: z
    .string()
    .trim()
    .max(300, 'Address cannot exceed 300 characters')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type NewPatientRegistrationInput = z.infer<typeof NewPatientRegistrationSchema>;

// Aliases for compatibility
export const PatientRegistrationSchema = NewPatientRegistrationSchema;
export type PatientRegistrationInput = NewPatientRegistrationInput;

/**
 * Strips HTML tags from strings to prevent XSS / markup injection.
 */
export function sanitizeText(input?: string | null): string {
  if (!input) return '';
  return input.replace(/[<>]/g, '').trim();
}
