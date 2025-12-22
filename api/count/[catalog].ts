import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSpaceTrackClient } from '../lib/space-track-client';

// In-memory cache
const cache = new Map<string, { count: number; timestamp: number }>();
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

    if (!catalog || typeof catalog !== 'string') {
      return res.status(400).json({ error: 'Catalog parameter is required' });
    }

    const cacheKey = `count:${catalog}`;
    const cached = cache.get(cacheKey);

    // Return cached count if valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Cache hit for ${cacheKey}`);
      return res.status(200).json({
        source: 'cache',
        count: cached.count,
      });
    }

    // Fetch fresh count
    console.log(`Cache miss for ${cacheKey}, fetching from Space-Track`);
    const client = getSpaceTrackClient();
    const count = await client.getObjectCount(catalog);

    // Cache the result
    cache.set(cacheKey, {
      count,
      timestamp: Date.now(),
    });

    // Set cache headers
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    return res.status(200).json({
      source: 'spacetrack',
      count,
    });
  } catch (error: any) {
    console.error('Error fetching object count:', error);
    return res.status(500).json({
      error: 'Failed to fetch object count',
      message: error.message,
    });
  }
}
