import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
  markRecovered,
} from '../db/queries.js';
import { generateSearchProfile } from '../ai/matcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for photo uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max per file
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
  },
});

/**
 * GET /api/items
 * List all items with scan/match summary counts.
 */
router.get('/', (req, res) => {
  try {
    const items = getItems();
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

/**
 * GET /api/items/:id
 * Get a single item with all its listings.
 */
router.get('/:id', (req, res) => {
  try {
    const item = getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

/**
 * POST /api/items
 * Create a new item with optional photo uploads.
 * Uses multer for multipart/form-data handling.
 */
router.post('/', upload.array('photos', 10), async (req, res) => {
  try {
    const { name, category, description, city, search_radius, scan_frequency } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Process and save uploaded photos
    const photoPaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`;
        const outputPath = path.join(uploadsDir, filename);

        // Resize to max 800px wide, preserving aspect ratio
        await sharp(file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .toFile(outputPath);

        photoPaths.push(`/uploads/${filename}`);
      }
    }

    // Generate structured search profile using AI (if description provided)
    let structured_profile = null;
    if (description) {
      try {
        const absolutePhotoPaths = photoPaths.map(p =>
          path.join(__dirname, '..', '..', p.replace(/^\//, ''))
        );
        structured_profile = await generateSearchProfile(description, absolutePhotoPaths);
      } catch (err) {
        console.warn('Failed to generate search profile:', err.message);
      }
    }

    const item = createItem({
      name,
      category: category || null,
      description: description || null,
      photos: photoPaths,
      structured_profile,
      city: city || null,
      search_radius: search_radius ? parseInt(search_radius, 10) : 50,
      scan_frequency: scan_frequency || 'daily',
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item. Supports optional new photo uploads.
 */
router.put('/:id', upload.array('photos', 10), async (req, res) => {
  try {
    const existing = getItem(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updates = {};
    const fields = ['name', 'category', 'description', 'city', 'search_radius', 'scan_frequency', 'active', 'status'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        if (field === 'search_radius' || field === 'active') {
          updates[field] = parseInt(req.body[field], 10);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // Handle new photo uploads
    if (req.files && req.files.length > 0) {
      const newPhotoPaths = [];
      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`;
        const outputPath = path.join(uploadsDir, filename);

        await sharp(file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .toFile(outputPath);

        newPhotoPaths.push(`/uploads/${filename}`);
      }

      // Merge with existing photos (or replace if existing_photos is provided)
      const existingPhotos = req.body.existing_photos
        ? JSON.parse(req.body.existing_photos)
        : existing.photos || [];
      updates.photos = [...existingPhotos, ...newPhotoPaths];
    }

    // Regenerate profile if description changed
    if (updates.description && updates.description !== existing.description) {
      try {
        const photos = updates.photos || existing.photos || [];
        const absolutePhotoPaths = photos.map(p =>
          path.join(__dirname, '..', '..', p.replace(/^\//, ''))
        );
        updates.structured_profile = await generateSearchProfile(updates.description, absolutePhotoPaths);
      } catch (err) {
        console.warn('Failed to regenerate search profile:', err.message);
      }
    }

    const item = updateItem(req.params.id, updates);
    res.json(item);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/items/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const existing = getItem(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }
    deleteItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

/**
 * POST /api/items/:id/recover
 * Mark an item as recovered.
 */
router.post('/:id/recover', (req, res) => {
  try {
    const existing = getItem(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = markRecovered(req.params.id);
    res.json(item);
  } catch (err) {
    console.error('Error marking item as recovered:', err);
    res.status(500).json({ error: 'Failed to mark item as recovered' });
  }
});

export default router;
