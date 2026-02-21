/**
 * Tests for authentication validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  passwordSchema,
  passwordChangeSchema,
  registrationSchema,
  emailSchema,
} from './auth.schema';

describe('authentication schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login credentials', () => {
      const validLogin = {
        username: 'testuser',
        password: 'Password123!@#',
      };

      const result = loginSchema.safeParse(validLogin);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
      }
    });

    it('should trim username whitespace', () => {
      const loginWithSpaces = {
        username: '  testuser  ',
        password: 'Password123!@#',
      };

      const result = loginSchema.safeParse(loginWithSpaces);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
      }
    });

    it('should reject short username', () => {
      const result = loginSchema.safeParse({
        username: 'ab',
        password: 'Password123!@#',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty username', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: 'Password123!@#',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: 'short',
      });

      expect(result.success).toBe(false);
    });

    it('should reject username longer than 50 characters', () => {
      const result = loginSchema.safeParse({
        username: 'a'.repeat(51),
        password: 'Password123!@#',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('Password123!@#');

      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('password123!@#');

      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123!@#');

      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Password!@#');

      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('Password123');

      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1!');

      expect(result.success).toBe(false);
    });

    it('should reject password longer than 100 characters', () => {
      const result = passwordSchema.safeParse('P'.repeat(50) + '1!a' + 'P'.repeat(50));

      expect(result.success).toBe(false);
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      for (const char of specialChars) {
        const result = passwordSchema.safeParse(`Password123${char}`);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('passwordChangeSchema', () => {
    it('should validate matching passwords', () => {
      const validPasswordChange = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const result = passwordChangeSchema.safeParse(validPasswordChange);

      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const mismatchedPasswords = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };

      const result = passwordChangeSchema.safeParse(mismatchedPasswords);

      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.errors.find(
          (err) => err.path.includes('confirmPassword')
        );
        expect(confirmError?.message).toContain('do not match');
      }
    });

    it('should reject weak new password', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty current password', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('registrationSchema', () => {
    it('should validate complete registration data', () => {
      const validRegistration = {
        username: 'newuser',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      const result = registrationSchema.safeParse(validRegistration);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('newuser@example.com');
        expect(result.data.username).toBe('newuser');
      }
    });

    it('should lowercase email', () => {
      const result = registrationSchema.safeParse({
        username: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should trim all string fields', () => {
      const result = registrationSchema.safeParse({
        username: '  testuser  ',
        email: '  test@example.com  ',
        firstName: '  John  ',
        lastName: '  Doe  ',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
      }
    });

    it('should reject invalid username characters', () => {
      const result = registrationSchema.safeParse({
        username: 'user@name!',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.success).toBe(false);
    });

    it('should accept valid username characters', () => {
      const validUsernames = ['user123', 'user_name', 'user-name', 'UserName'];

      for (const username of validUsernames) {
        const result = registrationSchema.safeParse({
          username,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject mismatched passwords', () => {
      const result = registrationSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = registrationSchema.safeParse({
        username: 'testuser',
        email: 'not-an-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty required fields', () => {
      const result = registrationSchema.safeParse({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse({
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should lowercase email', () => {
      const result = emailSchema.safeParse({
        email: 'TEST@EXAMPLE.COM',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should trim email whitespace', () => {
      const result = emailSchema.safeParse({
        email: '  test@example.com  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test',
        '',
        'test @example.com',
      ];

      for (const email of invalidEmails) {
        const result = emailSchema.safeParse({ email });
        expect(result.success).toBe(false);
      }
    });

    it('should reject empty email', () => {
      const result = emailSchema.safeParse({
        email: '',
      });

      expect(result.success).toBe(false);
    });
  });
});
