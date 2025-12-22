import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSpaceTrackClient } from './lib/space-track-client';

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
    const { name, limit } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    const searchLimit = limit ? parseInt(limit as string) : 10;

    console.log(`Searching for: ${name} (limit: ${searchLimit})`);
    const client = getSpaceTrackClient();
    const results = await client.searchByName(name, searchLimit);

    return res.status(200).json({
      query: name,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error('Error searching objects:', error);
    return res.status(500).json({
      error: 'Failed to search objects',
      message: error.message,
    });
  }
}
