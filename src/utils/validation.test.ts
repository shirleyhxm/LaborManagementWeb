/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateOrThrow,
  validateSafely,
  isValid,
  getFirstError,
  formatZodErrors,
} from './validation';

describe('validation utilities', () => {
  // Test schema
  const userSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().positive('Age must be positive'),
  });

  describe('validate', () => {
    it('should return success result for valid data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = validate(userSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
        expect(result.errors).toBeNull();
      }
    });

    it('should return error result for invalid data', () => {
      const invalidData = {
        name: '',
        email: 'not-an-email',
        age: -5,
      };

      const result = validate(userSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data).toBeNull();
        expect(result.errors).toBeDefined();
        expect(Object.keys(result.errors || {})).toContain('name');
        expect(Object.keys(result.errors || {})).toContain('email');
        expect(Object.keys(result.errors || {})).toContain('age');
      }
    });

    it('should handle missing fields', () => {
      const result = validate(userSchema, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.keys(result.errors || {}).length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle nested error paths', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      const result = validate(nestedSchema, { user: { profile: { name: '' } } });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorKeys = Object.keys(result.errors || {});
        expect(errorKeys.some(key => key.includes('user') && key.includes('profile') && key.includes('name'))).toBe(true);
      }
    });
  });

  describe('validateOrThrow', () => {
    it('should return validated data for valid input', () => {
      const validData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25,
      };

      const result = validateOrThrow(userSchema, validData);

      expect(result).toEqual(validData);
    });

    it('should throw ZodError for invalid input', () => {
      const invalidData = {
        name: '',
        email: 'invalid',
        age: -1,
      };

      expect(() => validateOrThrow(userSchema, invalidData)).toThrow();
    });
  });

  describe('validateSafely', () => {
    it('should return validated data for valid input', () => {
      const validData = {
        name: 'Bob Smith',
        email: 'bob@example.com',
        age: 40,
      };

      const result = validateSafely(userSchema, validData);

      expect(result).toEqual(validData);
    });

    it('should return undefined for invalid input', () => {
      const invalidData = {
        name: '',
        email: 'not-valid',
      };

      const result = validateSafely(userSchema, invalidData);

      expect(result).toBeUndefined();
    });
  });

  describe('isValid', () => {
    it('should return true for valid data', () => {
      const validData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        age: 35,
      };

      expect(isValid(userSchema, validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
      };

      expect(isValid(userSchema, invalidData)).toBe(false);
    });
  });

  describe('getFirstError', () => {
    it('should return first error message', () => {
      const errors = {
        name: 'Name is required',
        email: 'Invalid email',
        age: 'Age must be positive',
      };

      const firstError = getFirstError(errors);

      expect(firstError).toBe('Name is required');
    });

    it('should return null for empty errors', () => {
      const firstError = getFirstError({});

      expect(firstError).toBeNull();
    });
  });

  describe('formatZodErrors', () => {
    it('should format ZodError into field-level errors', () => {
      const invalidData = {
        name: '',
        email: 'not-an-email',
        age: -5,
      };

      try {
        userSchema.parse(invalidData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodErrors(error);

          expect(formatted).toBeDefined();
          expect(Object.keys(formatted)).toContain('name');
          expect(Object.keys(formatted)).toContain('email');
          expect(Object.keys(formatted)).toContain('age');
        }
      }
    });

    it('should handle nested paths correctly', () => {
      const nestedSchema = z.object({
        address: z.object({
          street: z.string().min(1),
          city: z.string().min(1),
        }),
      });

      try {
        nestedSchema.parse({ address: { street: '', city: '' } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodErrors(error);

          const keys = Object.keys(formatted);
          expect(keys.some(key => key.includes('address') && key.includes('street'))).toBe(true);
          expect(keys.some(key => key.includes('address') && key.includes('city'))).toBe(true);
        }
      }
    });
  });

  describe('type inference', () => {
    it('should correctly infer types from schemas', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        age: 30,
      };

      const result = validate(userSchema, validData);

      if (result.success) {
        // Type should be inferred correctly
        const name: string = result.data.name;
        const email: string = result.data.email;
        const age: number = result.data.age;

        expect(name).toBe('Test User');
        expect(email).toBe('test@example.com');
        expect(age).toBe(30);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = validate(userSchema, null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle undefined input', () => {
      const result = validate(userSchema, undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle array data', () => {
      const arraySchema = z.array(z.string().min(1));
      const result = validate(arraySchema, ['valid', 'data']);

      expect(result.success).toBe(true);
    });

    it('should handle optional fields', () => {
      const schemaWithOptional = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const result = validate(schemaWithOptional, { required: 'value' });

      expect(result.success).toBe(true);
    });
  });
});
