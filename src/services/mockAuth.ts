import { LoginCredentials, AuthResponse, User, UserRole } from '../types/auth';

// Mock users database
const mockUsers: Record<string, { password: string; user: User }> = {
  admin: {
    password: 'admin123',
    user: {
      id: '1',
      username: 'admin',
      email: 'admin@shiftoptimizer.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  },
  manager: {
    password: 'manager123',
    user: {
      id: '2',
      username: 'manager',
      email: 'manager@shiftoptimizer.com',
      firstName: 'Manager',
      lastName: 'Smith',
      role: UserRole.MANAGER,
    },
  },
  employee: {
    password: 'employee123',
    user: {
      id: '3',
      username: 'employee',
      email: 'employee@shiftoptimizer.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.EMPLOYEE,
    },
  },
};

// Generate a mock JWT token (not a real JWT, just a base64 encoded user ID)
function generateMockToken(userId: string): string {
  const tokenData = {
    userId,
    timestamp: Date.now(),
    expiresIn: 3600000, // 1 hour
  };
  return btoa(JSON.stringify(tokenData));
}

// Mock authentication service
export const mockAuthService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockUser = mockUsers[credentials.username];

    if (!mockUser || mockUser.password !== credentials.password) {
      throw new Error('Invalid username or password');
    }

    const token = generateMockToken(mockUser.user.id);

    return {
      user: mockUser.user,
      token,
    };
  },

  async logout(): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Nothing to do for mock logout
  },

  async validateToken(token: string): Promise<boolean> {
    try {
      const tokenData = JSON.parse(atob(token));
      const expiresAt = tokenData.timestamp + tokenData.expiresIn;
      return Date.now() < expiresAt;
    } catch {
      return false;
    }
  },
};
