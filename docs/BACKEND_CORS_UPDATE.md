# Backend Deployment Guide for Vercel (HTTPS Frontend + HTTP Backend)

This guide explains how to deploy a production frontend on Vercel (HTTPS) that communicates with an HTTP backend on EC2.

## Architecture Overview

Since Vercel serves your frontend over HTTPS but your EC2 backend runs on HTTP, browsers block direct requests due to **Mixed Content Policy**. The solution is to use a **Vercel serverless proxy** that:

1. Receives HTTPS requests from the browser
2. Forwards them to the HTTP backend (server-side, no browser restrictions)
3. Returns the response back to the browser over HTTPS

```
Browser (HTTPS) → Vercel App (HTTPS) → Proxy Function (HTTPS→HTTP) → EC2 Backend (HTTP)
```

---

## Step 1: Update EC2 Security Group

### AWS Console Steps:
1. Go to **AWS Console** → **EC2** → **Security Groups**
2. Find your backend security group (e.g., `labor-management-backend-sg`)
3. Click **Edit inbound rules**
4. Add/update the rule for port 8080:
   - **Type:** Custom TCP
   - **Protocol:** TCP
   - **Port Range:** `8080`
   - **Source:** `0.0.0.0/0` (Anywhere IPv4)
   - **Description:** `Public API - secured via JWT auth, accessed via Vercel proxy`
5. Optionally add IPv6:
   - **Source:** `::/0` (Anywhere IPv6)
6. Click **Save rules**

**Why this is secure:**
- Your API requires JWT authentication for all protected routes
- The backend validates all requests regardless of origin
- Only the proxy can bypass browser mixed content restrictions
- No sensitive data is exposed without valid authentication tokens

---

## Step 2: Verify Vercel Proxy Configuration

The proxy is already set up in your project. Here's how it works:

### Files Involved:

**`api/proxy.ts`** - Serverless function that forwards requests:
```typescript
// Receives: https://your-app.vercel.app/api/proxy/auth/login
// Forwards to: http://3.131.96.75:8080/api/auth/login
// Returns response back to browser over HTTPS
```

**`vercel.json`** - Routing configuration:
```json
{
  "rewrites": [
    {
      "source": "/api/proxy/:path*",
      "destination": "/api/proxy?path=:path*"
    }
  ]
}
```

**`.env.production`** - Frontend configuration:
```env
VITE_API_BASE_URL=/api/proxy
```

### How Requests Flow:

1. Frontend calls: `/auth/login`
2. With base URL `/api/proxy`, becomes: `/api/proxy/auth/login`
3. Vercel rewrite passes to serverless function: `/api/proxy?path=auth/login`
4. Proxy constructs backend URL: `http://3.131.96.75:8080/api/auth/login`
5. Proxy forwards request and returns response

---

## Step 3: Set Environment Variables in Vercel

### Vercel Dashboard Steps:
1. Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**
2. Add the following variables for **Production** environment:

### Required Variables:
```
VITE_APP_ENV=production
VITE_API_BASE_URL=/api/proxy
```

### Optional but Recommended:
```
VITE_FEATURE_OPTIMIZATION_WORKFLOW=false
VITE_FEATURE_LEGACY_UI=false
VITE_AUTH_TOKEN_EXPIRY=15
VITE_AUTH_REFRESH_TOKEN_EXPIRY=7
VITE_MONITORING_ENV=production
VITE_API_TIMEOUT=30000
VITE_API_MAX_RETRIES=3
VITE_FORCE_HTTPS=false
VITE_ENABLE_CSP=true
VITE_LOG_LEVEL=info
VITE_ENABLE_CONSOLE_LOGS=false
```

3. After adding/updating variables, **redeploy** your Vercel project

---

## Step 4: Update Backend CORS Configuration (Optional)

Since requests come through the Vercel proxy (server-side), CORS is less critical. However, it's good practice to configure it:

### File to Edit:
`/path/to/LaborManagement/src/main/kotlin/org/labormanagement/Application.kt`

### Update the CORS block:

```kotlin
install(CORS) {
    // Allow localhost for development
    allowHost("localhost:3001", schemes = listOf("http"))
    allowHost("localhost:3000", schemes = listOf("http"))
    allowHost("localhost:4173", schemes = listOf("http"))  // Vite preview server

    // Allow Vercel domain (requests come from proxy, but good to include)
    allowHost("labor-management-web.vercel.app", schemes = listOf("https"))

    // Allow all standard headers
    allowHeader(HttpHeaders.ContentType)
    allowHeader(HttpHeaders.Authorization)
    allowHeader("X-User-Id")
    allowHeader("X-Business-Id")

    // Allow credentials (cookies, authorization headers)
    allowCredentials = true

    // Allow all standard HTTP methods
    allowMethod(HttpMethod.Options)
    allowMethod(HttpMethod.Get)
    allowMethod(HttpMethod.Post)
    allowMethod(HttpMethod.Put)
    allowMethod(HttpMethod.Patch)
    allowMethod(HttpMethod.Delete)

    // Expose headers so frontend can read them
    exposeHeader(HttpHeaders.ContentType)
    exposeHeader(HttpHeaders.Authorization)
    exposeHeader("X-User-Id")
    exposeHeader("X-Business-Id")
}
```

### Rebuild and Restart Backend:

```bash
# Navigate to backend directory
cd /path/to/LaborManagement

# Pull latest changes if using git
git pull

# Rebuild the application
./gradlew build

# Restart the service
# If using systemd:
sudo systemctl restart labor-management

# If running manually:
pkill -f "java.*labor-management"
java -jar build/libs/your-app.jar &

# Verify it's running
curl http://localhost:8080/health
```

---

## Step 5: Test the Connection

### From your browser:
1. Visit `https://labor-management-web.vercel.app`
2. Open browser DevTools → Network tab
3. Try logging in or making an API request

### Expected Results:
- ✅ No mixed content errors
- ✅ No CORS errors
- ✅ Requests go to `/api/proxy/...` (HTTPS)
- ✅ Proxy forwards to `http://3.131.96.75:8080/api/...`
- ✅ Authentication works correctly

### Common Issues:

**Issue:** Mixed Content error
- **Cause:** `VITE_API_BASE_URL` not set to `/api/proxy` in Vercel environment variables
- **Solution:** Update environment variable in Vercel dashboard and redeploy

**Issue:** Proxy timeout error
- **Cause:** EC2 security group blocking traffic from Vercel's servers
- **Solution:** Ensure port 8080 allows `0.0.0.0/0` in EC2 security group

**Issue:** 500 error from proxy
- **Cause:** Backend not running or unreachable
- **Solution:** SSH into EC2 and verify backend is running: `curl http://localhost:8080/health`

**Issue:** Connection refused
- **Cause:** Backend application not running on EC2
- **Solution:** Start/restart the backend application

---

## Long-Term Recommendations

### Current Approach: Vercel Proxy (HTTP Backend)
**Pros:**
- ✅ Quick to implement
- ✅ No SSL certificate setup needed on EC2
- ✅ Works immediately with existing HTTP backend
- ✅ Suitable for MVP and early-stage production

**Cons:**
- ⚠️ Backend traffic is unencrypted (HTTP)
- ⚠️ Proxy adds small latency (~10-50ms per request)
- ⚠️ Vercel function execution costs (though minimal)

### Recommended Production Approach: HTTPS Backend

For production at scale, upgrade to HTTPS on the backend:

#### Option 1: Let's Encrypt SSL Certificate (Free)
```bash
# On EC2 instance
sudo apt update
sudo apt install certbot

# Get SSL certificate (requires domain name)
sudo certbot certonly --standalone -d api.yourdomain.com

# Configure your backend to use SSL certificate
# Update backend to listen on HTTPS (port 443)
```

**Update Vercel environment variable:**
```
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

**Remove proxy** - Frontend can call backend directly over HTTPS

#### Option 2: AWS Application Load Balancer (ALB)
1. Create an ALB in AWS
2. Configure SSL certificate via AWS Certificate Manager (free)
3. ALB terminates SSL and forwards to EC2 over HTTP
4. Point your domain to ALB
5. Update Vercel to use ALB URL

#### Option 3: AWS API Gateway
1. Create API Gateway REST API
2. Configure HTTP integration to EC2 backend
3. Enable SSL on API Gateway (automatic)
4. Use API Gateway URL in Vercel environment variables

---

## Security Considerations

### Current Setup (Proxy + HTTP Backend):
- ✅ Frontend to Proxy: **Encrypted (HTTPS)**
- ⚠️ Proxy to Backend: **Unencrypted (HTTP)** - Traffic visible on network
- ✅ Authentication: **JWT tokens** protect all sensitive routes
- ✅ EC2 Security Group: Limits access to port 8080

### Recommended Setup (Direct HTTPS Backend):
- ✅ End-to-end encryption
- ✅ No proxy latency
- ✅ Industry standard for production
- ✅ Better security for sensitive data in transit

---

## Quick Reference

| Component | Current Value | Production Recommendation |
|-----------|--------------|---------------------------|
| Frontend URL | `https://labor-management-web.vercel.app` | Same |
| Backend URL | `http://3.131.96.75:8080` | `https://api.yourdomain.com` |
| Vercel API Base | `/api/proxy` | `https://api.yourdomain.com/api` |
| Encryption | Frontend↔Proxy: HTTPS<br>Proxy↔Backend: HTTP | End-to-end HTTPS |
| Proxy Needed | Yes | No (with HTTPS backend) |

---

## Monitoring and Debugging

### View Vercel Proxy Logs:
1. Go to Vercel Dashboard → Deployments → Latest
2. Click "Functions" tab
3. Click `/api/proxy`
4. View real-time logs

### Test Backend Directly:
```bash
# From local machine
curl http://3.131.96.75:8080/health

# Test auth endpoint
curl -X POST http://3.131.96.75:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Check EC2 Backend Logs:
```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@3.131.96.75

# View application logs
sudo journalctl -u labor-management -f  # if using systemd
# or
tail -f /path/to/logs/application.log
```

---

## Migration Path to HTTPS Backend

When ready to upgrade:

1. **Acquire domain name** (e.g., api.yourdomain.com)
2. **Set up SSL certificate** (Let's Encrypt or AWS Certificate Manager)
3. **Update backend** to serve HTTPS on port 443
4. **Update Vercel environment variable:**
   - Change `VITE_API_BASE_URL` from `/api/proxy` to `https://api.yourdomain.com/api`
5. **Remove proxy files** (optional cleanup):
   - Delete `api/proxy.ts`
   - Remove proxy rewrite from `vercel.json`
6. **Redeploy** Vercel application

No code changes needed - just configuration updates!