import type { LoginCredentials, AuthResponse, RefreshTokenResponse, RegisterRequest } from '../types/auth';
import { api } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Let API errors propagate directly with their original messages
    return await api.post<AuthResponse>('/auth/login', credentials);
  },

  async register(request: RegisterRequest): Promise<AuthResponse> {
    // Let API errors propagate directly with their original messages
    return await api.post<AuthResponse>('/auth/register', request);
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

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // Let API errors propagate directly with their original messages
    return await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    }, {
      skipRetry: true, // Don't retry refresh token requests
    });
  },
};
