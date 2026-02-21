import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { User, LoginCredentials, AuthContextType } from '../types/auth';
import { authService } from '../services/authService';
import { env } from '../config/env';
import { setSentryUser } from '../config/sentry';
import { logAuthEvent } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'token_expiry';

interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate token expiry timestamp
   */
  const calculateTokenExpiry = useCallback((): number => {
    const expiryMinutes = env.authTokenExpiry;
    return Date.now() + (expiryMinutes * 60 * 1000);
  }, []);

  /**
   * Check if token is expired or will expire soon (within 1 minute)
   */
  const isTokenExpiring = useCallback((expiresAt: number): boolean => {
    const bufferMs = 60 * 1000; // 1 minute buffer
    return Date.now() >= (expiresAt - bufferMs);
  }, []);

  /**
   * Store token data
   */
  const storeTokenData = useCallback((tokenData: TokenData, userData: User) => {
    localStorage.setItem(TOKEN_KEY, tokenData.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refreshToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, tokenData.expiresAt.toString());
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setToken(tokenData.token);
    setUser(userData);

    // Set user context in Sentry for error tracking
    setSentryUser({
      id: userData.id,
      email: userData.email,
      role: userData.role,
    });
  }, []);

  /**
   * Clear all auth data
   */
  const clearAuthData = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);

    setUser(null);
    setToken(null);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Clear user context in Sentry
    setSentryUser(null);
  }, []);

  /**
   * Refresh access token using refresh token
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        clearAuthData();
        logAuthEvent('token_expired');
        return false;
      }

      // Call refresh token endpoint
      const response = await authService.refreshToken(refreshToken);

      // Store new token data
      const tokenData: TokenData = {
        token: response.token,
        refreshToken: response.refreshToken || refreshToken,
        expiresAt: calculateTokenExpiry(),
      };

      storeTokenData(tokenData, response.user);

      // Schedule next refresh
      scheduleTokenRefresh(tokenData.expiresAt);

      // Log successful refresh
      logAuthEvent('token_refresh', response.user.id);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthData();
      logAuthEvent('token_expired');
      return false;
    }
  }, [clearAuthData, calculateTokenExpiry, storeTokenData]);

  /**
   * Schedule automatic token refresh
   */
  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Calculate when to refresh (2 minutes before expiry)
    const refreshBuffer = 2 * 60 * 1000; // 2 minutes
    const refreshAt = expiresAt - refreshBuffer;
    const delay = refreshAt - Date.now();

    if (delay > 0) {
      refreshTimerRef.current = setTimeout(() => {
        refreshAccessToken();
      }, delay);

      if (env.isDevelopment) {
        console.log(`Token refresh scheduled in ${Math.round(delay / 1000)} seconds`);
      }
    } else {
      // Token already expired or about to expire, refresh immediately
      refreshAccessToken();
    }
  }, [refreshAccessToken]);

  /**
   * Validate stored token on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

      if (storedToken && storedUser && storedExpiry) {
        try {
          const userData = JSON.parse(storedUser);
          const expiresAt = parseInt(storedExpiry, 10);

          // Check if token is expired
          if (isTokenExpiring(expiresAt)) {
            // Try to refresh token
            const refreshed = await refreshAccessToken();

            if (!refreshed) {
              clearAuthData();
            }
          } else {
            // Token is still valid
            setToken(storedToken);
            setUser(userData);

            // Schedule refresh for later
            scheduleTokenRefresh(expiresAt);
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          clearAuthData();
        }
      }

      setIsLoading(false);
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []); // Only run on mount

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);

      // Store token data with expiry
      const tokenData: TokenData = {
        token: response.token,
        refreshToken: response.refreshToken || response.token, // Fallback if backend doesn't provide separate refresh token
        expiresAt: calculateTokenExpiry(),
      };

      storeTokenData(tokenData, response.user);

      // Schedule automatic refresh
      scheduleTokenRefresh(tokenData.expiresAt);

      // Log successful login
      logAuthEvent('login', response.user.id, {
        username: credentials.username,
        role: response.user.role,
      });
    } catch (error) {
      // Log failed login attempt
      logAuthEvent('login', undefined, {
        username: credentials.username,
        success: false,
      });
      throw error;
    }
  };

  const logout = async () => {
    const userId = user?.id;

    try {
      // Call logout endpoint to invalidate tokens on server
      await authService.logout();
    } catch (error) {
      // Continue with logout even if server call fails
      console.error('Logout error:', error);
    } finally {
      clearAuthData();

      // Log logout
      logAuthEvent('logout', userId);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
