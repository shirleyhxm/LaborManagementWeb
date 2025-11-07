# Authentication Setup

This application includes a complete authentication system with support for both mock (development) and real API authentication.

## Current Mode: Mock Authentication

The app is currently configured to use **mock authentication** for development and testing without requiring a backend API.

### Available Mock Accounts

| Role     | Username   | Password      |
|----------|------------|---------------|
| Admin    | `admin`    | `admin123`    |
| Manager  | `manager`  | `manager123`  |
| Employee | `employee` | `employee123` |

## Switching to Real API Authentication

When your backend API is ready, follow these steps:

### 1. Update the Auth Service

Edit `src/services/authService.ts` and change:

```typescript
const USE_MOCK_AUTH = true;
```

to:

```typescript
const USE_MOCK_AUTH = false;
```

### 2. Ensure Backend is Running

Make sure your backend API is running on `http://0.0.0.0:8080` (or update the proxy in `vite.config.ts`).

### 3. Required Backend Endpoints

Your backend must implement these authentication endpoints:

#### POST `/api/auth/login`

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "ADMIN" | "MANAGER" | "EMPLOYEE"
  },
  "token": "string"
}
```

#### POST `/api/auth/logout`

**Request:** Empty body `{}`

**Response:** Success status

#### GET `/api/auth/validate`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** 200 if valid, 401/403 if invalid

## How Authentication Works

1. **Login Flow:**
   - User enters credentials on login page
   - Credentials sent to authentication service
   - On success: user data and JWT token stored in localStorage
   - User redirected to main application

2. **Protected Routes:**
   - All app routes except `/login` are protected
   - `ProtectedRoute` component checks authentication status
   - Unauthenticated users redirected to login page

3. **API Requests:**
   - All API requests automatically include `Authorization: Bearer <token>` header
   - Token retrieved from localStorage
   - Managed by the API service (`src/services/api.ts`)

4. **Logout:**
   - Clears token and user data from localStorage
   - Redirects to login page

## File Structure

```
src/
├── components/
│   ├── LoginPage.tsx          # Login UI component
│   └── ProtectedRoute.tsx     # Route protection wrapper
├── contexts/
│   └── AuthContext.tsx        # Global auth state management
├── services/
│   ├── authService.ts         # Auth API integration
│   ├── mockAuth.ts            # Mock authentication service
│   └── api.ts                 # HTTP client with auth headers
└── types/
    └── auth.ts                # TypeScript types for auth
```

## Security Notes

- Mock authentication is **NOT secure** and should only be used for development
- In production, always use real API authentication with secure JWT tokens
- Tokens are stored in localStorage (consider httpOnly cookies for production)
- The mock token is just base64-encoded data (not a real JWT)

## Troubleshooting

### "HTTP 404: Not Found" Error

This means the backend API is not running or doesn't have the authentication endpoints. Make sure:
- Backend is running on port 8080
- Authentication endpoints are implemented
- OR use mock authentication mode for development
