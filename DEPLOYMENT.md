# Deployment Guide

This guide covers deploying the Debris Simulator to both GitHub Pages (frontend only) and Vercel (full-stack with API).

## Prerequisites

1. Space-Track.org account (free)
   - Sign up at: https://www.space-track.org/auth/createAccount
   - Note your email and password for API access

## Option 1: GitHub Pages (Frontend Only)

GitHub Pages can host the static frontend, but you'll need a separate backend server for API calls.

### Steps:

1. **Install gh-pages package** (if not already installed):
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy to GitHub Pages**:
   ```bash
   npm run deploy
   ```

4. **Configure GitHub repository**:
   - Go to your repository settings
   - Navigate to Pages section
   - Select `gh-pages` branch as the source
   - Your site will be available at: `https://<username>.github.io/debris-simulator-claude-code/`

### Limitations:
- Frontend only - no API backend
- Requires separate backend server for Space-Track API calls
- Best for demo/preview purposes

## Option 2: Vercel (Recommended - Full Stack)

Vercel provides both static hosting and serverless functions, making it ideal for this full-stack application.

### Steps:

1. **Install Vercel CLI** (optional, for local testing):
   ```bash
   npm install -g vercel
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Space-Track credentials:
     ```
     SPACETRACK_EMAIL=your-email@example.com
     SPACETRACK_PASSWORD=your-password
     ```

3. **Deploy to Vercel**:

   **Option A: Using Vercel CLI**
   ```bash
   vercel login
   vercel
   ```
   Follow the prompts to deploy. On first deployment:
   - Link to existing project or create new one
   - Keep default settings
   - Deploy!

   **Option B: Using Vercel Dashboard**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your Git repository
   - Configure environment variables in project settings:
     - `SPACETRACK_EMAIL`: Your Space-Track email
     - `SPACETRACK_PASSWORD`: Your Space-Track password
   - Deploy!

4. **Configure Environment Variables in Vercel Dashboard**:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the following variables:
     - `SPACETRACK_EMAIL`: Your Space-Track email
     - `SPACETRACK_PASSWORD`: Your Space-Track password
   - Redeploy if needed

5. **Access your deployment**:
   - Your site will be available at: `https://your-project.vercel.app`
   - Or use a custom domain if configured

### Vercel API Endpoints:

Once deployed, your API will be available at:
- `GET /api/tle/:catalog` - Fetch TLE data (catalog: 'active', 'analyst', 'all', or NORAD ID)
- `GET /api/count/:catalog` - Get object count
- `GET /api/search?name=<query>&limit=<n>` - Search by name

### Local Development with Vercel:

To test the Vercel setup locally:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Run development server**:
   ```bash
   vercel dev
   ```
   This will:
   - Start Vite dev server
   - Run serverless functions locally
   - Link environment variables from `.env`

## Architecture

### GitHub Pages Setup:
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── Static Assets (HTML/CSS/JS) ──> GitHub Pages
       │
       └─── API Calls ──> Separate Backend Server
```

### Vercel Setup:
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── Static Assets (HTML/CSS/JS) ──> Vercel CDN
       │
       └─── API Calls (/api/*) ──> Vercel Serverless Functions
                                       │
                                       └──> Space-Track.org API
```

## Caching

Both deployment options include caching:

- **In-memory cache**: 24-hour TTL for TLE data and counts
- **CDN cache**: Vercel edge caching for faster global access
- **Browser cache**: Client-side caching with stale-while-revalidate

## Monitoring

### Vercel Analytics:
- Enable in project settings to track:
  - Page views
  - API call performance
  - Error rates
  - Geographic distribution

### Logs:
- View real-time logs in Vercel dashboard
- Check serverless function execution
- Monitor Space-Track API calls

## Troubleshooting

### Common Issues:

1. **API calls fail with CORS errors**:
   - Check that `vercel.json` includes CORS headers
   - Ensure environment variables are set correctly

2. **Space-Track authentication fails**:
   - Verify credentials in environment variables
   - Check Space-Track.org service status
   - Ensure account is active

3. **Build fails**:
   - Run `npm run build` locally to identify issues
   - Check TypeScript errors
   - Verify all dependencies are installed

4. **404 on API routes**:
   - Ensure API files are in `/api` directory
   - Check `vercel.json` rewrites configuration
   - Verify file naming (use `[catalog].ts` for dynamic routes)

## Cost Considerations

### GitHub Pages:
- **Free** for public repositories
- **Storage**: 1GB limit
- **Bandwidth**: 100GB/month soft limit

### Vercel:
- **Hobby Plan** (Free):
  - 100GB bandwidth
  - 100 hours serverless function execution
  - Unlimited API requests
  - Perfect for personal projects

- **Pro Plan** ($20/month):
  - 1TB bandwidth
  - 1000 hours serverless function execution
  - Advanced analytics
  - Better for production use with user accounts

## Recommended Setup

For development and MVP:
- Use **Vercel** for full-stack deployment
- Monitor usage on free tier
- Upgrade to Pro when adding user accounts

For future scaling (Phase 2+):
- Consider dedicated backend server
- Implement database for user accounts
- Use Vercel for frontend + API gateway
