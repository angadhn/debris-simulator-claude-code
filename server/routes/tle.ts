import express, { Request, Response } from 'express';
import { SpaceTrackClient } from '../space-track-client.js';

const router = express.Router();

// Create Space-Track client instance
const spaceTrackClient = new SpaceTrackClient(
  process.env.SPACETRACK_EMAIL || '',
  process.env.SPACETRACK_PASSWORD || ''
);

// In-memory cache for TLE data
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * GET /api/tle/:catalog
 * Fetch TLE data for a specific catalog
 *
 * Catalogs:
 * - active: Active satellites (not decayed), typically ~5,000-8,000 objects
 * - analyst: Debris and rocket bodies
 * - all: Everything (use with caution)
 * - [number]: Specific NORAD ID
 *
 * Query params:
 * - limit: Maximum number of objects (default: 10000)
 * - skipCache: Force refresh from Space-Track (default: false)
 */
router.get('/:catalog', async (req: Request, res: Response) => {
  try {
    const { catalog } = req.params;
    const limit = parseInt(req.query.limit as string) || 10000;
    const skipCache = req.query.skipCache === 'true';

    console.log(`TLE request: catalog=${catalog}, limit=${limit}, skipCache=${skipCache}`);

    // Check cache first
    const cacheKey = `${catalog}-${limit}`;
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('Returning cached TLE data');
        return res.json({
          source: 'cache',
          count: cached.data.length,
          data: cached.data,
        });
      }
    }

    // Fetch from Space-Track
    const tleData = await spaceTrackClient.getTLEData(catalog, limit);

    // Cache the result
    cache.set(cacheKey, {
      data: tleData,
      timestamp: Date.now(),
    });

    res.json({
      source: 'spacetrack',
      count: tleData.length,
      data: tleData,
    });
  } catch (error) {
    console.error('TLE endpoint error:', error);
    res.status(500).json({
      error: 'Failed to fetch TLE data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/tle/search/:name
 * Search for objects by name
 *
 * Query params:
 * - limit: Maximum number of results (default: 100)
 */
router.get('/search/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    console.log(`TLE search: name=${name}, limit=${limit}`);

    const results = await spaceTrackClient.searchByName(name, limit);

    res.json({
      query: name,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('TLE search error:', error);
    res.status(500).json({
      error: 'Failed to search TLE data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/tle/cache
 * Clear the TLE cache
 */
router.delete('/cache', (req: Request, res: Response) => {
  const size = cache.size;
  cache.clear();
  console.log(`Cleared ${size} cache entries`);
  res.json({
    message: 'Cache cleared',
    entriesCleared: size,
  });
});

export { router as tleRouter };
