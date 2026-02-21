export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string; // Optional for backward compatibility
}

export interface RefreshTokenResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}
