# Backend Authentication Implementation Prompt

Use this prompt when working in the backend repository to implement authentication endpoints.

---

## Task: Implement Authentication Endpoints for Labor Management Web App

I need you to implement JWT-based authentication endpoints for a Labor Management web application. The frontend (React/TypeScript) is already built and expects specific API endpoints and response formats.

### Context

- **Backend Framework:** Kotlin with Ktor
- **Base URL:** All endpoints should be under `/api/auth/`
- **Backend Port:** 8080
- **Authentication Method:** JWT (JSON Web Tokens)
- **Frontend Integration:** Frontend automatically sends `Authorization: Bearer <token>` header on all requests after login

### Required Endpoints

Implement the following three authentication endpoints:

#### 1. POST `/api/auth/login` (CRITICAL - Required)

**Purpose:** Authenticate user credentials and return a JWT token

**Request:**
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200 OK):**
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

**Error Responses:**
- 401 Unauthorized:
```json
{
  "message": "Invalid username or password"
}
```
- 400 Bad Request:
```json
{
  "message": "Username and password are required"
}
```

#### 2. POST `/api/auth/logout` (Optional)

**Purpose:** Server-side token cleanup/invalidation

**Request:**
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- Body: `{}`

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### 3. GET `/api/auth/validate` (Optional)

**Purpose:** Validate a JWT token

**Request:**
- Headers: `Authorization: Bearer <token>`

**Success Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "ADMIN" | "MANAGER" | "EMPLOYEE"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Invalid or expired token"
}
```

### Data Models

Create these data models:

```kotlin
// User entity/model
data class User(
    val id: String,
    val username: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val passwordHash: String,  // Never return this to frontend
    val role: UserRole
)

enum class UserRole {
    ADMIN,    // Full system access
    MANAGER,  // Schedule management access
    EMPLOYEE  // View-only access
}

// Request/Response DTOs
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
```

### JWT Token Requirements

- **Algorithm:** HS256 or RS256
- **Secret:** Use a strong secret key (minimum 256 bits)
- **Expiration:** 24 hours (configurable)
- **Required Claims:**
  - `userId` - User's unique identifier
  - `username` - Username
  - `role` - User role (ADMIN/MANAGER/EMPLOYEE)
  - `iat` - Issued at timestamp
  - `exp` - Expiration timestamp

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

### Security Requirements

1. **Password Hashing:**
   - Use bcrypt with work factor of 12+
   - Never store plain text passwords
   - Verify passwords using bcrypt's compare function

2. **JWT Security:**
   - Store JWT secret in environment variable (not hardcoded)
   - Validate token signature on all protected endpoints
   - Check token expiration

3. **CORS Configuration:**
   - Allow requests from `http://localhost:3000` (development)
   - Include credentials in CORS policy
   - Set appropriate CORS headers

4. **Rate Limiting:**
   - Implement rate limiting on login endpoint (e.g., 5 attempts per minute per IP)

5. **Input Validation:**
   - Validate username format (alphanumeric, min 3 chars)
   - Validate password format (min 8 chars)
   - Sanitize all inputs

### Test Users to Create

Create these test users in the database (for development/testing):

```kotlin
// passwords shown in plain text for reference, store as bcrypt hashes
val testUsers = listOf(
    User(
        id = "1",
        username = "admin",
        email = "admin@shiftoptimizer.com",
        firstName = "Admin",
        lastName = "User",
        passwordHash = bcrypt.hashpw("admin123", bcrypt.gensalt()),
        role = UserRole.ADMIN
    ),
    User(
        id = "2",
        username = "manager",
        email = "manager@shiftoptimizer.com",
        firstName = "Manager",
        lastName = "Smith",
        passwordHash = bcrypt.hashpw("manager123", bcrypt.gensalt()),
        role = UserRole.MANAGER
    ),
    User(
        id = "3",
        username = "employee",
        email = "employee@shiftoptimizer.com",
        firstName = "John",
        lastName = "Doe",
        passwordHash = bcrypt.hashpw("employee123", bcrypt.gensalt()),
        role = UserRole.EMPLOYEE
    )
)
```

### Dependencies to Add

```kotlin
// build.gradle.kts
dependencies {
    // JWT authentication
    implementation("io.ktor:ktor-server-auth:$ktor_version")
    implementation("io.ktor:ktor-server-auth-jwt:$ktor_version")

    // Password hashing
    implementation("org.mindrot:jbcrypt:0.4")

    // CORS support
    implementation("io.ktor:ktor-server-cors:$ktor_version")
}
```

### Implementation Structure

Organize the code as follows:

```
src/main/kotlin/
├── routes/
│   └── AuthRoutes.kt          # Auth endpoint handlers
├── services/
│   ├── AuthService.kt         # Business logic for authentication
│   ├── JwtService.kt          # JWT token generation/validation
│   └── UserService.kt         # User database operations
├── models/
│   ├── User.kt                # User entity
│   └── AuthModels.kt          # Request/Response DTOs
└── Application.kt             # Configure JWT and install routes
```

### Testing Instructions

After implementation, test with these curl commands:

```bash
# Test login with admin credentials
curl -X POST http://0.0.0.0:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Expected response:
# {
#   "user": {
#     "id": "1",
#     "username": "admin",
#     "email": "admin@shiftoptimizer.com",
#     "firstName": "Admin",
#     "lastName": "User",
#     "role": "ADMIN"
#   },
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# Test with invalid credentials
curl -X POST http://0.0.0.0:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'

# Expected response: 401 with error message

# Test token validation (replace TOKEN with actual token from login)
curl -X GET http://0.0.0.0:8080/api/auth/validate \
  -H "Authorization: Bearer TOKEN"
```

### Integration with Existing Endpoints

After implementing authentication, you should protect existing endpoints:

1. **All endpoints require authentication** except `/api/auth/login`
2. **Extract user info from JWT** to determine permissions
3. **Implement role-based access control:**
   - Employee endpoints: POST/PUT/DELETE require ADMIN or MANAGER role
   - Schedule publish: Requires MANAGER or ADMIN role
   - Schedule delete: Requires ADMIN role

**Example of protecting an endpoint:**
```kotlin
authenticate {
    get("/api/employees") {
        val principal = call.principal<JWTPrincipal>()
        val userId = principal?.payload?.getClaim("userId")?.asString()
        val role = principal?.payload?.getClaim("role")?.asString()

        // Fetch and return employees
    }
}
```

### Configuration

Create a configuration file or use environment variables:

```kotlin
// application.conf or application.yaml
jwt {
    secret = ${?JWT_SECRET}  // From environment variable
    issuer = "labor-management-app"
    audience = "labor-management-users"
    realm = "Labor Management App"
    expiration = 86400000  // 24 hours in milliseconds
}
```

### Success Criteria

The implementation is complete when:

1. ✅ User can login with valid credentials and receive a JWT token
2. ✅ Invalid credentials return 401 error with appropriate message
3. ✅ Generated JWT token contains all required claims
4. ✅ Token validation endpoint correctly validates/invalidates tokens
5. ✅ Frontend can successfully authenticate and access protected routes
6. ✅ All three test users (admin, manager, employee) can login
7. ✅ Passwords are securely hashed (never stored in plain text)
8. ✅ CORS is configured to allow frontend requests

### Common Pitfalls to Avoid

- ❌ Don't return password hash in any response
- ❌ Don't hardcode JWT secret in source code
- ❌ Don't skip password hashing
- ❌ Don't forget to set token expiration
- ❌ Don't miss CORS configuration (frontend won't be able to call API)
- ❌ Don't validate tokens on the login endpoint itself

### Additional Notes

- The frontend stores the token in localStorage with key `auth_token`
- The frontend stores user data in localStorage with key `auth_user`
- All subsequent API requests automatically include `Authorization: Bearer <token>` header
- The frontend handles logout by clearing localStorage and redirecting to login page
- Token refresh is not currently implemented (tokens expire after 24 hours)

### Questions to Consider

1. Where will user data be stored? (In-memory, database, file?)
2. Do we need a database migration for the users table?
3. Should we implement token refresh functionality?
4. Do we need password reset/forgot password endpoints?
5. Should we implement account registration or is this admin-only?

Please implement the authentication system following these specifications. Focus first on the critical `/api/auth/login` endpoint, then add the optional endpoints if needed.
