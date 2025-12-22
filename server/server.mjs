import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SpaceTrackClient } from './space-track-client.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize Space-Track client
const spaceTrackClient = new SpaceTrackClient(
  process.env.SPACETRACK_EMAIL,
  process.env.SPACETRACK_PASSWORD
);

// In-memory cache
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get TLE data
app.get('/api/tle/:catalog', async (req, res) => {
  try {
    const { catalog } = req.params;
    const limit = parseInt(req.query.limit) || 10000;
    const skipCache = req.query.skipCache === 'true';

    console.log(`TLE request: catalog=${catalog}, limit=${limit}`);

    // Check cache
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
      message: error.message,
    });
  }
});

// Clear cache
app.delete('/api/tle/cache', (req, res) => {
  const size = cache.size;
  cache.clear();
  console.log(`Cleared ${size} cache entries`);
  res.json({
    message: 'Cache cleared',
    entriesCleared: size,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('===========================================');
  console.log('Space Debris Simulator API Server');
  console.log('===========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`TLE endpoint: http://localhost:${PORT}/api/tle/:catalog`);
  console.log('===========================================');

  if (!process.env.SPACETRACK_EMAIL || !process.env.SPACETRACK_PASSWORD) {
    console.warn('WARNING: Space-Track credentials not found!');
  } else {
    console.log(`Space-Track email: ${process.env.SPACETRACK_EMAIL}`);
  }
});
