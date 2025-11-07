import { LoginCredentials, AuthResponse } from '../types/auth';
import { api } from './api';
import { mockAuthService } from './mockAuth';

// Enable mock authentication for development when backend is not available
// Set to false when backend API is ready
const USE_MOCK_AUTH = true;

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      return mockAuthService.login(credentials);
    }

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
    if (USE_MOCK_AUTH) {
      return mockAuthService.logout();
    }

    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    }
  },

  async validateToken(token: string): Promise<boolean> {
    if (USE_MOCK_AUTH) {
      return mockAuthService.validateToken(token);
    }

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
