/**
 * Validation utilities
 *
 * Helper functions for using Zod validation schemas throughout the application
 */

import { z, ZodError } from 'zod';

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T; errors: null }
  | { success: false; data: null; errors: Record<string, string> };

/**
 * Validate data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * const result = validate(loginSchema, formData);
 * if (result.success) {
 *   // result.data is typed as LoginInput
 *   await login(result.data);
 * } else {
 *   // result.errors contains field-level errors
 *   setErrors(result.errors);
 * }
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validData = schema.parse(data);
    return {
      success: true,
      data: validData,
      errors: null,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      // Convert Zod errors to field-level error object
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return {
        success: false,
        data: null,
        errors,
      };
    }
    throw error;
  }
}

/**
 * Validate data and throw on error
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 *
 * @example
 * try {
 *   const validData = validateOrThrow(loginSchema, formData);
 *   await login(validData);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     // Handle validation errors
 *   }
 * }
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate data safely (returns undefined on error)
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or undefined
 *
 * @example
 * const validData = validateSafely(loginSchema, formData);
 * if (validData) {
 *   await login(validData);
 * }
 */
export function validateSafely<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

/**
 * Get first error message from validation errors
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
}

/**
 * Convert Zod errors to form-friendly format
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });
  return formatted;
}

/**
 * Check if data is valid without throwing
 */
export function isValid<T>(schema: z.ZodSchema<T>, data: unknown): boolean {
  const result = schema.safeParse(data);
  return result.success;
}
