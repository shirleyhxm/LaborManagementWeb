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
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string; // Optional for backward compatibility
  businessId?: string; // Optional, included when user registers and auto-creates business
}

export interface RefreshTokenResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  businessName?: string; // Optional business name for auto-creation
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithResponse: (response: AuthResponse) => void;
  logout: () => Promise<void>;
  updateUser: (changes: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}
