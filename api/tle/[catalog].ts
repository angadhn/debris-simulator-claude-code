import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSpaceTrackClient } from '../lib/space-track-client.js';

// In-memory cache (will persist during function warm-up)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { catalog } = req.query;
    const limit = parseInt(req.query.limit as string) || 1000;

    if (!catalog || typeof catalog !== 'string') {
      return res.status(400).json({ error: 'Catalog parameter is required' });
    }

    const cacheKey = `tle:${catalog}:${limit}`;
    const cached = cache.get(cacheKey);

    // Return cached data if valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Cache hit for ${cacheKey}`);
      return res.status(200).json({
        source: 'cache',
        count: cached.data.length,
        data: cached.data,
      });
    }

    // Fetch fresh data
    console.log(`Cache miss for ${cacheKey}, fetching from Space-Track`);
    const client = getSpaceTrackClient();
    const data = await client.getTLEData(catalog, limit);

    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Set cache headers for CDN/browser caching
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    return res.status(200).json({
      source: 'spacetrack',
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching TLE data:', error);
    return res.status(500).json({
      error: 'Failed to fetch TLE data',
      message: error.message,
    });
  }
}
