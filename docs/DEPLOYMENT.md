# Deployment Guide - Vercel

This document outlines how to deploy the ShiftOptimizer application to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed (optional): `npm i -g vercel`

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import your Git repository**
   - Go to https://vercel.com/new
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Import this repository

2. **Configure the project**
   - Framework Preset: **Vite** (should be auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `build`
   - Install Command: `npm install` (default)

3. **Set environment variables**

   In the Vercel dashboard, go to **Settings → Environment Variables** and add the following variables based on `.env.example`:

   **Required Variables:**
   - `VITE_API_BASE_URL` - Your backend API URL (e.g., `https://api.yourdomain.com/api`)
   - `VITE_APP_ENV` - Set to `production`

   **Optional Variables:**
   - `VITE_FEATURE_OPTIMIZATION_WORKFLOW` - `true` or `false`
   - `VITE_FEATURE_LEGACY_UI` - `true` or `false`
   - `VITE_AUTH_TOKEN_EXPIRY` - Token expiry in minutes (default: 15)
   - `VITE_AUTH_REFRESH_TOKEN_EXPIRY` - Refresh token expiry in days (default: 7)
   - `VITE_SENTRY_DSN` - Sentry error tracking DSN (if using Sentry)
   - `VITE_GA_TRACKING_ID` - Google Analytics ID (if using GA)
   - `VITE_MONITORING_ENV` - `production`
   - `VITE_API_TIMEOUT` - API timeout in ms (default: 30000)
   - `VITE_API_MAX_RETRIES` - Max retry attempts (default: 3)
   - `VITE_FORCE_HTTPS` - `true` for production
   - `VITE_ENABLE_CSP` - `true` for security
   - `VITE_LOG_LEVEL` - `info` or `error` for production
   - `VITE_ENABLE_CONSOLE_LOGS` - `false` for production

4. **Deploy**
   - Click **Deploy**
   - Vercel will automatically build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy to production**
   ```bash
   vercel --prod
   ```

3. **Set environment variables via CLI**
   ```bash
   vercel env add VITE_API_BASE_URL production
   vercel env add VITE_APP_ENV production
   # Add other variables as needed
   ```

## Configuration Files

### vercel.json

The `vercel.json` file is configured with:
- **SPA routing**: All routes redirect to `index.html` for client-side routing
- **Asset caching**: Static assets in `/assets/` are cached for 1 year
- **Build settings**: Framework preset and output directory

### Environment Variables

All environment variables are prefixed with `VITE_` to be accessible in the Vite application. Reference `.env.example` for the complete list.

## Automatic Deployments

Once connected to your Git repository, Vercel will automatically:
- Deploy **production** builds from the `main` branch
- Create **preview** deployments for pull requests
- Provide unique URLs for each deployment

## Custom Domain

To add a custom domain:
1. Go to **Settings → Domains** in your Vercel project
2. Add your domain
3. Follow the DNS configuration instructions

## Monitoring

- **Build logs**: Available in the Vercel dashboard for each deployment
- **Runtime logs**: Access via Vercel dashboard or CLI (`vercel logs`)
- **Error tracking**: Configure Sentry by setting `VITE_SENTRY_DSN`

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment variables not working
- Ensure variables are prefixed with `VITE_`
- Redeploy after adding new environment variables
- Check variable scope (Production, Preview, Development)

### API connection issues
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on your backend
- Ensure backend is accessible from Vercel's servers

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
