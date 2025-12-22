import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tleRouter } from './routes/tle.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow requests from frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health endpoint called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('Registering routes...');
console.log('tleRouter:', tleRouter);

// API routes
app.use('/api/tle', tleRouter);

console.log('Routes registered');

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`Space Debris Simulator API Server`);
  console.log(`===========================================`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`TLE endpoint: http://localhost:${PORT}/api/tle/:catalog`);
  console.log(`===========================================`);

  // Verify credentials are loaded
  if (!process.env.SPACETRACK_EMAIL || !process.env.SPACETRACK_PASSWORD) {
    console.warn('WARNING: Space-Track credentials not found in environment!');
    console.warn('Make sure SPACETRACK_EMAIL and SPACETRACK_PASSWORD are set in .env');
  } else {
    console.log(`Space-Track email: ${process.env.SPACETRACK_EMAIL}`);
  }
});

export default app;
