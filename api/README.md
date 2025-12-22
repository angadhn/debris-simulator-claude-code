# API - Vercel Serverless Functions

This directory contains Vercel serverless functions that provide backend API endpoints for the Debris Simulator.

## Structure

```
api/
├── lib/
│   └── space-track-client.ts    # Space-Track.org API client
├── tle/
│   └── [catalog].ts              # Dynamic route for TLE data
├── count/
│   └── [catalog].ts              # Dynamic route for object counts
└── search.ts                     # Search endpoint
```

## Endpoints

### GET /api/tle/:catalog

Fetch TLE (Two-Line Element) data for space objects.

**Parameters:**
- `catalog` (path): Catalog type
  - `active` - Active satellites updated in last 30 days
  - `analyst` - Debris and rocket bodies
  - `all` - All objects
  - `<NORAD_ID>` - Specific object by NORAD catalog number
- `limit` (query, optional): Maximum number of objects (default: 1000)

**Response:**
```json
{
  "source": "cache" | "spacetrack",
  "count": 1000,
  "data": [
    {
      "NORAD_CAT_ID": "25544",
      "OBJECT_NAME": "ISS (ZARYA)",
      "OBJECT_TYPE": "PAYLOAD",
      "TLE_LINE0": "0 ISS (ZARYA)",
      "TLE_LINE1": "1 25544U 98067A   ...",
      "TLE_LINE2": "2 25544  51.6416 ...",
      "EPOCH": "2025-12-22T12:00:00",
      "INCLINATION": "51.6416",
      "ECCENTRICITY": "0.0001234",
      "MEAN_MOTION": "15.50103472",
      "SEMIMAJOR_AXIS": "6798.137",
      "PERIOD": "92.912",
      "APOGEE": "420.123",
      "PERIGEE": "418.456",
      "COUNTRY_CODE": "ISS",
      "LAUNCH_DATE": "1998-11-20",
      "RCS_SIZE": "LARGE"
    }
  ]
}
```

**Caching:**
- In-memory: 24 hours
- CDN: Edge caching enabled

### GET /api/count/:catalog

Get total count of objects in a catalog.

**Parameters:**
- `catalog` (path): Catalog type (same as `/api/tle/:catalog`)

**Response:**
```json
{
  "source": "cache" | "spacetrack",
  "count": 25000
}
```

**Caching:**
- In-memory: 24 hours
- CDN: Edge caching enabled

### GET /api/search

Search for space objects by name.

**Parameters:**
- `name` (query, required): Search query (case-insensitive, partial match)
- `limit` (query, optional): Maximum results (default: 10)

**Response:**
```json
{
  "query": "ISS",
  "count": 5,
  "data": [
    // Same format as TLE data
  ]
}
```

## Authentication

All endpoints require Space-Track.org credentials configured as environment variables:

```bash
SPACETRACK_EMAIL=your-email@example.com
SPACETRACK_PASSWORD=your-password
```

The Space-Track client handles:
- Automatic login with cookie-based sessions
- Session expiry (1 hour) with auto-renewal
- Request rate limiting

## Local Development

### Using Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Create .env file with credentials
cp .env.example .env
# Edit .env with your Space-Track credentials

# Run dev server
vercel dev
```

This will:
- Start Vite dev server on port 3000
- Run serverless functions locally
- Hot reload on changes

### Using Express Server (Alternative):

```bash
# Start backend server
npm run dev:server  # Port 3001

# Start frontend (in another terminal)
npm run dev         # Port 5173
```

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `405` - Method not allowed
- `500` - Server error (Space-Track API failure, authentication error, etc.)

## Performance

### Caching Strategy:
1. **In-Memory Cache** (serverless function lifetime)
   - Survives warm function instances
   - 24-hour TTL
   - Per-function instance

2. **CDN Edge Cache** (Vercel CDN)
   - `Cache-Control: s-maxage=86400, stale-while-revalidate`
   - Distributed globally
   - Fast response times

### Cold Start:
- First request may take 2-3 seconds (authentication + data fetch)
- Subsequent requests from cache: <100ms
- Function warm-up lasts ~5 minutes

## Space-Track.org API

### Rate Limits:
- 20 requests per minute per IP
- 200 requests per hour per IP
- Be mindful of these limits in production

### Query Syntax:
The Space-Track API uses a custom query syntax:
- `DECAY_DATE/null-val` - Only non-decayed objects
- `EPOCH/>now-30` - Updated in last 30 days
- `orderby/NORAD_CAT_ID` - Sort by catalog ID
- `limit/1000` - Limit results
- `format/json` - JSON response

See: https://www.space-track.org/documentation

## Security

### Environment Variables:
- Never commit `.env` file
- Use Vercel dashboard or CLI to set production secrets
- Rotate credentials regularly

### CORS:
- Currently allows all origins (`*`)
- Consider restricting in production:
  ```typescript
  res.setHeader('Access-Control-Allow-Origin', 'https://your-domain.com');
  ```

## Deployment

### Vercel:
```bash
# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables:
Set in Vercel dashboard under Project Settings → Environment Variables

## Monitoring

Check logs in Vercel dashboard:
- Function execution time
- Error rates
- Cache hit/miss ratios
- Space-Track API response times

## Future Enhancements

- [ ] Implement Vercel KV for distributed caching
- [ ] Add request rate limiting per user
- [ ] Implement webhook for real-time TLE updates
- [ ] Add analytics endpoint for usage tracking
- [ ] Database integration for user accounts (Phase 2)
