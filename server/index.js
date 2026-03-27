import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from ../.env or ../.env.example
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.example') });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import { init as initDatabase } from './db/schema.js';
import { getItems, getScansForItem } from './db/queries.js';

import itemsRouter from './routes/items.js';
import scansRouter, { runScanForItem } from './routes/scans.js';
import listingsRouter from './routes/listings.js';
import settingsRouter from './routes/settings.js';
import exportRouter from './routes/export.js';

// Initialize database tables
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/items', itemsRouter);
app.use('/api/scans', scansRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/export', exportRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve React Frontend (production) ──────────────────────────────────────

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// All non-API routes serve the React app (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Scheduled Scanning ─────────────────────────────────────────────────────

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log(`[Scheduler] Running scheduled scan check at ${new Date().toISOString()}`);

  try {
    const items = getItems();
    const activeItems = items.filter(item => item.active && item.status === 'active');

    for (const item of activeItems) {
      const shouldScan = isItemDueForScan(item);

      if (shouldScan) {
        console.log(`[Scheduler] Scanning item: ${item.name} (ID: ${item.id})`);
        try {
          await runScanForItem(item.id);
        } catch (err) {
          console.error(`[Scheduler] Scan failed for item ${item.id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error in scheduled scan:', err);
  }
});

/**
 * Determine if an item is due for scanning based on its scan_frequency and last scan time.
 */
function isItemDueForScan(item) {
  const scans = getScansForItem(item.id);

  // If never scanned, scan now
  if (scans.length === 0) return true;

  const lastScan = new Date(scans[0].ran_at);
  const now = new Date();
  const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);

  switch (item.scan_frequency) {
    case '6h':
      return hoursSinceLastScan >= 6;
    case '12h':
      return hoursSinceLastScan >= 12;
    case 'daily':
      return hoursSinceLastScan >= 24;
    default:
      return hoursSinceLastScan >= 24;
  }
}

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`RecoverWatch server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database initialized`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(`Scheduled scanning: enabled (hourly check)`);
});

export default app;
