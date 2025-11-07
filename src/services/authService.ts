import { LoginCredentials, AuthResponse } from '../types/auth';
import { api } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response;
    } catch (error: any) {
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    }
  },

  async validateToken(token: string): Promise<boolean> {
    try {
      await api.get('/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  },
};
