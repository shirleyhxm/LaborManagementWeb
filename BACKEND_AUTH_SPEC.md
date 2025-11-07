# Backend Authentication Endpoints Required

This document outlines the authentication endpoints that need to be implemented in the backend API for the login flow to work.

## Base URL

All endpoints should be prefixed with `/api` as configured in the Vite proxy:
- Development: `http://0.0.0.0:8080/api`
- Proxy: Frontend requests to `/api/*` are proxied to backend

## Required Authentication Endpoints

### 1. Login Endpoint

**POST** `/api/auth/login`

Authenticates a user and returns a JWT token.

#### Request Headers
```
Content-Type: application/json
```

#### Request Body
```typescript
{
  "username": string,
  "password": string
}
```

**Example:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Success Response (200 OK)
```typescript
{
  "user": {
    "id": string,
    "username": string,
    "email": string,
    "firstName": string,
    "lastName": string,
    "role": "ADMIN" | "MANAGER" | "EMPLOYEE"
  },
  "token": string  // JWT or Bearer token
}
```

**Example:**
```json
{
  "user": {
    "id": "1",
    "username": "admin",
    "email": "admin@shiftoptimizer.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**401 Unauthorized** - Invalid credentials
```json
{
  "message": "Invalid username or password"
}
```

**400 Bad Request** - Missing or invalid fields
```json
{
  "message": "Username and password are required"
}
```

**500 Internal Server Error** - Server error
```json
{
  "message": "An error occurred during authentication"
}
```

---

### 2. Logout Endpoint

**POST** `/api/auth/logout`

Logs out the current user (optional - can be used for server-side cleanup like blacklisting tokens).

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body
```json
{}
```

#### Success Response (200 OK)
```json
{
  "message": "Logged out successfully"
}
```

**Note:** The frontend clears the token from localStorage regardless of backend response. This endpoint is primarily for server-side token invalidation if needed.

---

### 3. Token Validation Endpoint

**GET** `/api/auth/validate`

Validates a JWT token (optional - can be used for token verification).

#### Request Headers
```
Authorization: Bearer <token>
```

#### Success Response (200 OK)
```json
{
  "valid": true,
  "user": {
    "id": string,
    "username": string,
    "email": string,
    "firstName": string,
    "lastName": string,
    "role": "ADMIN" | "MANAGER" | "EMPLOYEE"
  }
}
```

#### Error Responses

**401 Unauthorized** - Invalid or expired token
```json
{
  "message": "Invalid or expired token"
}
```

**403 Forbidden** - Token validation failed
```json
{
  "message": "Token validation failed"
}
```

---

## Authentication Flow

### Frontend Flow

1. **User visits app** → Redirected to `/login` if not authenticated
2. **User submits credentials** → POST to `/api/auth/login`
3. **Backend validates credentials** → Returns user object + JWT token
4. **Frontend stores token** → Saves to localStorage with key `auth_token`
5. **Frontend stores user** → Saves to localStorage with key `auth_user`
6. **All subsequent API calls** → Include `Authorization: Bearer <token>` header
7. **User logs out** → Token and user data cleared from localStorage

### Token Usage

The frontend automatically includes the token in all API requests via the API service (`src/services/api.ts`):

```typescript
headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

---

## Data Models

### User Model

```typescript
interface User {
  id: string;              // Unique user identifier
  username: string;        // Username for login
  email: string;          // User email
  firstName: string;      // First name
  lastName: string;       // Last name
  role: UserRole;         // User role/permission level
}

enum UserRole {
  ADMIN = 'ADMIN',       // Full system access
  MANAGER = 'MANAGER',   // Schedule management access
  EMPLOYEE = 'EMPLOYEE'  // View-only access
}
```

### Token

- **Type:** JWT (JSON Web Token)
- **Algorithm:** HS256, RS256, or equivalent
- **Expiration:** Recommended 1-24 hours
- **Claims:** Should include `userId`, `username`, `role`, `iat`, `exp`

**Example JWT Payload:**
```json
{
  "userId": "1",
  "username": "admin",
  "role": "ADMIN",
  "iat": 1699999999,
  "exp": 1700003599
}
```

---

## Security Considerations

### Backend Requirements

1. **Password Hashing**
   - Use bcrypt, Argon2, or similar
   - Never store passwords in plain text

2. **JWT Security**
   - Use strong secret key (minimum 256 bits)
   - Set appropriate expiration time
   - Include token refresh mechanism for longer sessions

3. **CORS Configuration**
   - Allow requests from frontend origin (http://localhost:3000 in dev)
   - Include credentials in CORS policy

4. **Rate Limiting**
   - Implement rate limiting on login endpoint
   - Prevent brute force attacks

5. **Input Validation**
   - Validate username and password format
   - Sanitize inputs to prevent injection attacks

6. **HTTPS**
   - Use HTTPS in production
   - Never send tokens over unencrypted connections

### Frontend Implementation Details

The frontend already includes:
- ✅ Token storage in localStorage
- ✅ Automatic token injection in API requests
- ✅ Protected routes with authentication checks
- ✅ Token and user data cleared on logout
- ✅ Redirect to login on authentication failure

---

## Testing the Endpoints

### Using curl

**Login Request:**
```bash
curl -X POST http://0.0.0.0:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Validate Token:**
```bash
curl -X GET http://0.0.0.0:8080/api/auth/validate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Logout:**
```bash
curl -X POST http://0.0.0.0:8080/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{}'
```

---

## Integration with Existing Endpoints

Once authentication is implemented, all existing endpoints should require authentication:

### Employee Endpoints
- GET `/api/employees` - Requires valid token
- POST `/api/employees` - Requires ADMIN or MANAGER role
- PUT `/api/employees/:id` - Requires ADMIN or MANAGER role
- DELETE `/api/employees/:id` - Requires ADMIN role

### Schedule Endpoints
- GET `/api/schedules` - Requires valid token
- POST `/api/schedules/generate` - Requires MANAGER or ADMIN role
- POST `/api/schedules/:id/publish` - Requires MANAGER or ADMIN role
- DELETE `/api/schedules/:id` - Requires ADMIN role

### Sales Forecast Endpoints
- GET `/api/sales-forecast` - Requires valid token
- PUT `/api/sales-forecast` - Requires MANAGER or ADMIN role

---

## Example Backend Implementation (Kotlin/Ktor)

### Dependencies Required

```kotlin
// build.gradle.kts
implementation("io.ktor:ktor-server-auth:$ktor_version")
implementation("io.ktor:ktor-server-auth-jwt:$ktor_version")
implementation("org.mindrot:jbcrypt:0.4")
```

### Sample Auth Route Structure

```kotlin
// AuthRoutes.kt
fun Route.authRoutes() {
    route("/auth") {
        post("/login") {
            val credentials = call.receive<LoginRequest>()

            // Validate credentials
            val user = userService.authenticate(credentials.username, credentials.password)
                ?: return@post call.respond(
                    HttpStatusCode.Unauthorized,
                    mapOf("message" to "Invalid username or password")
                )

            // Generate JWT token
            val token = JwtService.generateToken(user)

            call.respond(AuthResponse(
                user = UserDTO.from(user),
                token = token
            ))
        }

        post("/logout") {
            authenticate {
                // Optional: Blacklist token
                call.respond(HttpStatusCode.OK, mapOf("message" to "Logged out successfully"))
            }
        }

        get("/validate") {
            authenticate {
                val principal = call.principal<JWTPrincipal>()
                val userId = principal?.payload?.getClaim("userId")?.asString()

                val user = userService.findById(userId)
                    ?: return@authenticate call.respond(HttpStatusCode.Unauthorized)

                call.respond(mapOf(
                    "valid" to true,
                    "user" to UserDTO.from(user)
                ))
            }
        }
    }
}
```

### Data Classes

```kotlin
data class LoginRequest(
    val username: String,
    val password: String
)

data class AuthResponse(
    val user: UserDTO,
    val token: String
)

data class UserDTO(
    val id: String,
    val username: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: UserRole
)

enum class UserRole {
    ADMIN, MANAGER, EMPLOYEE
}
```

---

## Summary

### Minimum Required Endpoints

1. ✅ **POST `/api/auth/login`** - Essential for login flow
2. ⚠️ **POST `/api/auth/logout`** - Optional (frontend handles logout locally)
3. ⚠️ **GET `/api/auth/validate`** - Optional (frontend uses token directly)

### Frontend Files Modified

- `src/types/auth.ts` - Type definitions
- `src/contexts/AuthContext.tsx` - Global auth state
- `src/services/authService.ts` - Auth API calls
- `src/services/api.ts` - Automatic token injection
- `src/components/LoginPage.tsx` - Login UI
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/main.tsx` - Routing setup
- `src/App.tsx` - User display and logout

### Next Steps

1. Implement the three authentication endpoints in your Kotlin/Ktor backend
2. Set up JWT token generation and validation
3. Create a user database/model
4. Test the login endpoint with the frontend
5. Once working, protect other endpoints with JWT authentication
