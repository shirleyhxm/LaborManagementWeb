import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import type { User, LoginCredentials, AuthContextType, AuthResponse } from '../types/auth';
import { authService } from '../services/authService';
import { env } from '../config/env';
import { setSentryUser } from '../config/sentry';
import { logAuthEvent } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const LAST_ACTIVITY_KEY = 'last_activity_at';

// How long a user can go without interacting before their session is
// allowed to lapse, regardless of how much access-token lifetime remains.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Activity is recorded at most this often, so high-frequency events like
// mousemove/scroll don't spam localStorage writes on every tick.
const ACTIVITY_THROTTLE_MS = 5 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

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
  const lastActivityThrottleRef = useRef(0);

  /**
   * Record that the user did something (click, keypress, scroll, touch).
   * Persisted to localStorage so activity in any tab keeps all tabs alive,
   * and throttled so high-frequency events don't hammer localStorage.
   */
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityThrottleRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }
    lastActivityThrottleRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }, []);

  /**
   * Whether the user has been idle for longer than IDLE_TIMEOUT_MS.
   * Falls back to "not idle" if no activity has been recorded yet, so a
   * freshly logged-in session isn't immediately treated as idle.
   */
  const isIdle = useCallback((): boolean => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;
    return Date.now() - parseInt(lastActivity, 10) > IDLE_TIMEOUT_MS;
  }, []);

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
   * Patch fields on the signed-in user, keeping the cached copy in step.
   *
   * The user object is persisted so a refresh doesn't need a round trip, which
   * means anything that changes the account server-side has to say so here too
   * or the UI keeps rendering the stale copy until the next login.
   */
  const updateUser = useCallback((changes: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...changes };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
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
    localStorage.removeItem(LAST_ACTIVITY_KEY);

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
   * Called when the refresh timer fires. Only actually refreshes the access
   * token if the user has been active recently; an idle session is left to
   * expire instead, regardless of how much access-token lifetime remains.
   */
  const handleRefreshTimerFired = useCallback(async () => {
    if (isIdle()) {
      logAuthEvent('token_expired');
      clearAuthData();
      return;
    }
    await refreshAccessToken();
  }, [isIdle, clearAuthData, refreshAccessToken]);

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
        handleRefreshTimerFired();
      }, delay);

      if (env.isDevelopment) {
        console.log(`Token refresh scheduled in ${Math.round(delay / 1000)} seconds`);
      }
    } else {
      // Token already expired or about to expire
      handleRefreshTimerFired();
    }
  }, [handleRefreshTimerFired]);

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

          // A session that's been idle too long is treated as expired even
          // if the access token itself would still technically be valid,
          // e.g. a tab left open overnight.
          if (isIdle()) {
            clearAuthData();
            logAuthEvent('token_expired');
          } else if (isTokenExpiring(expiresAt)) {
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

  /**
   * Track user activity while authenticated, so idle sessions can be
   * distinguished from active ones when the refresh timer fires.
   */
  useEffect(() => {
    if (!token) return;

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
    };
  }, [token, recordActivity]);

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
      recordActivity();

      // Schedule automatic refresh
      scheduleTokenRefresh(tokenData.expiresAt);

      // Log successful login
      logAuthEvent('login', response.user.id, {
        email: credentials.email,
        role: response.user.role,
      });
    } catch (error) {
      // Log failed login attempt
      logAuthEvent('login', undefined, {
        email: credentials.email,
        success: false,
      });
      throw error;
    }
  };

  /**
   * Log in using an already-obtained AuthResponse (e.g. from accepting an
   * employee invite), instead of calling the login endpoint directly.
   */
  const loginWithResponse = (response: AuthResponse) => {
    const tokenData: TokenData = {
      token: response.token,
      refreshToken: response.refreshToken || response.token,
      expiresAt: calculateTokenExpiry(),
    };

    storeTokenData(tokenData, response.user);
    recordActivity();
    scheduleTokenRefresh(tokenData.expiresAt);

    logAuthEvent('login', response.user.id, {
      email: response.user.email,
      role: response.user.role,
    });
  };

  const logout = async () => {
    const userId = user?.id;
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;

    try {
      // Call logout endpoint to revoke the refresh token server-side
      await authService.logout(storedRefreshToken);
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
    loginWithResponse,
    logout,
    updateUser,
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
