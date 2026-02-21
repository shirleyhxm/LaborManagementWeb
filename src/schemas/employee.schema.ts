/**
 * Zod validation schemas for employee management
 */

import { z } from 'zod';

/**
 * Employee creation schema
 */
export const createEmployeeSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-()]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  hourlyRate: z
    .number()
    .positive('Hourly rate must be positive')
    .min(0.01, 'Hourly rate must be at least $0.01')
    .max(1000, 'Hourly rate must be less than $1000')
    .optional(),
  skills: z.array(z.string()).optional(),
  availability: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Employee update schema (partial)
 */
export const updateEmployeeSchema = createEmployeeSchema.partial();

/**
 * Bulk import employee schema
 */
export const bulkImportEmployeeSchema = z.array(createEmployeeSchema).min(1, 'At least one employee required');

// Export types
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type BulkImportEmployeeInput = z.infer<typeof bulkImportEmployeeSchema>;
