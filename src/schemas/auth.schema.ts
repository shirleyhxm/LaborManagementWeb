/**
 * Zod validation schemas for authentication
 *
 * Provides type-safe validation for auth-related forms and data
 */

import { z } from 'zod';

/**
 * Login credentials validation schema
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

/**
 * Password validation schema (for password change/reset)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Password change schema (with confirmation)
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * User registration schema
 */
export const registrationSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be less than 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
      .trim(),
    email: z
      .string()
      .email('Invalid email address')
      .min(1, 'Email is required')
      .max(100, 'Email must be less than 100 characters')
      .toLowerCase()
      .trim(),
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
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Email validation schema
 */
export const emailSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .toLowerCase()
    .trim(),
});

// Export types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
