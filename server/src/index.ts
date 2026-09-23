import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import policyRoutes from './routes/policyRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import { hospitalService } from './services/hospitalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static mock PDFs / uploads if needed
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/mock-policies', express.static(path.resolve(__dirname, '../../mock-policies')));

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'SehatSure Backend',
    timestamp: new Date().toISOString()
  });
});

// Feature 1: Policy Routes
app.use('/api/policy', policyRoutes);
app.use('/api/policies', policyRoutes);

// Feature 2 & 3: Hospital Discovery, Ranking & Bill Breakdown Routes
app.use('/api/hospitals', hospitalRoutes);

// 404 handler for API
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API route does not exist.'
    }
  });
});

async function startServer() {
  try {
    await connectDB();
    await hospitalService.initData();
    app.listen(config.port, () => {
      console.log(`[Server] SehatSure API running on port ${config.port}`);
      console.log(`[Server] Client origin allowed: ${config.clientUrl}`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
