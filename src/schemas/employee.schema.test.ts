/**
 * Tests for employee validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  bulkImportEmployeeSchema,
} from './employee.schema';

describe('employee schemas', () => {
  describe('createEmployeeSchema', () => {
    it('should validate complete employee data', () => {
      const validEmployee = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        hourlyRate: 25.5,
        skills: ['cooking', 'management'],
        availability: {
          monday: ['9:00', '17:00'],
          tuesday: ['9:00', '17:00'],
        },
      };

      const result = createEmployeeSchema.safeParse(validEmployee);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
        expect(result.data.hourlyRate).toBe(25.5);
      }
    });

    it('should validate minimal required employee data', () => {
      const minimalEmployee = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = createEmployeeSchema.safeParse(minimalEmployee);

      expect(result.success).toBe(true);
    });

    it('should trim first and last names', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: '  John  ',
        lastName: '  Doe  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
      }
    });

    it('should lowercase and trim email', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        email: '  JOHN.DOE@EXAMPLE.COM  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john.doe@example.com');
      }
    });

    it('should reject empty first name', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: '',
        lastName: 'Doe',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty last name', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject names longer than 50 characters', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'A'.repeat(51),
        lastName: 'Doe',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
      });

      expect(result.success).toBe(false);
    });

    it('should accept valid phone number formats', () => {
      const validPhoneNumbers = [
        '+1-555-123-4567',
        '555-123-4567',
        '(555) 123-4567',
        '+44 20 1234 5678',
        '1234567890',
      ];

      for (const phone of validPhoneNumbers) {
        const result = createEmployeeSchema.safeParse({
          firstName: 'John',
          lastName: 'Doe',
          phone,
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid phone number formats', () => {
      const invalidPhoneNumbers = [
        'abc-def-ghij',
        '123',
        'phone#123',
      ];

      for (const phone of invalidPhoneNumbers) {
        const result = createEmployeeSchema.safeParse({
          firstName: 'John',
          lastName: 'Doe',
          phone,
        });

        expect(result.success).toBe(false);
      }
    });

    it('should accept empty string for phone', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        phone: '',
      });

      expect(result.success).toBe(true);
    });

    it('should reject phone numbers shorter than 10 digits', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        phone: '123456789',
      });

      expect(result.success).toBe(false);
    });

    it('should reject phone numbers longer than 20 characters', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        phone: '1'.repeat(21),
      });

      expect(result.success).toBe(false);
    });

    it('should validate positive hourly rate', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        hourlyRate: 25.5,
      });

      expect(result.success).toBe(true);
    });

    it('should reject negative hourly rate', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        hourlyRate: -10,
      });

      expect(result.success).toBe(false);
    });

    it('should reject zero hourly rate', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        hourlyRate: 0,
      });

      expect(result.success).toBe(false);
    });

    it('should reject hourly rate below minimum', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        hourlyRate: 0.005,
      });

      expect(result.success).toBe(false);
    });

    it('should reject hourly rate above maximum', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        hourlyRate: 1500,
      });

      expect(result.success).toBe(false);
    });

    it('should validate skills array', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        skills: ['cooking', 'cleaning', 'management'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skills).toHaveLength(3);
      }
    });

    it('should accept empty skills array', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        skills: [],
      });

      expect(result.success).toBe(true);
    });

    it('should validate availability object', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        availability: {
          monday: ['9:00', '17:00'],
          tuesday: ['10:00', '18:00'],
          wednesday: ['9:00', '15:00'],
        },
      });

      expect(result.success).toBe(true);
    });

    it('should accept empty availability object', () => {
      const result = createEmployeeSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        availability: {},
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateEmployeeSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        firstName: 'Jane',
      };

      const result = updateEmployeeSchema.safeParse(partialUpdate);

      expect(result.success).toBe(true);
    });

    it('should validate updated fields', () => {
      const result = updateEmployeeSchema.safeParse({
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
    });

    it('should accept empty update object', () => {
      const result = updateEmployeeSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('should validate all updated fields', () => {
      const result = updateEmployeeSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-987-6543',
        hourlyRate: 30,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('bulkImportEmployeeSchema', () => {
    it('should validate array of employees', () => {
      const employees = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      ];

      const result = bulkImportEmployeeSchema.safeParse(employees);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('should reject empty array', () => {
      const result = bulkImportEmployeeSchema.safeParse([]);

      expect(result.success).toBe(false);
    });

    it('should reject array with invalid employees', () => {
      const employees = [
        {
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          firstName: '', // Invalid: empty first name
          lastName: 'Smith',
        },
      ];

      const result = bulkImportEmployeeSchema.safeParse(employees);

      expect(result.success).toBe(false);
    });

    it('should validate large arrays', () => {
      const employees = Array.from({ length: 100 }, (_, i) => ({
        firstName: `Employee${i}`,
        lastName: `LastName${i}`,
      }));

      const result = bulkImportEmployeeSchema.safeParse(employees);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(100);
      }
    });
  });
});
