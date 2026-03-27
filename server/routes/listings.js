import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getItem,
  getListingsForItem,
  updateListingStatus,
  createListing,
  createScan,
  updateScan,
} from '../db/queries.js';
import { analyzeImageMatch, analyzeDescriptionMatch } from '../ai/matcher.js';
import { analyzeListingUrl } from '../scrapers/manual.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * GET /api/listings/:itemId
 * Get all listings for an item. Filterable by match_score and status query params.
 */
router.get('/:itemId', (req, res) => {
  try {
    const item = getItem(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { match_score, status } = req.query;
    const listings = getListingsForItem(req.params.itemId, { match_score, status });
    res.json(listings);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * PUT /api/listings/:id/status
 * Update a listing's status (reviewed/dismissed).
 */
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['new', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be one of: new, reviewed, dismissed' });
    }

    const listing = updateListingStatus(req.params.id, status);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(listing);
  } catch (err) {
    console.error('Error updating listing status:', err);
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

/**
 * POST /api/listings/analyze-url
 * Manual paste-a-listing flow: takes { itemId, url }, fetches listing, runs AI analysis.
 */
router.post('/analyze-url', async (req, res) => {
  try {
    const { itemId, url } = req.body;

    if (!itemId || !url) {
      return res.status(400).json({ error: 'itemId and url are required' });
    }

    const item = getItem(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Fetch and parse the listing URL
    const listingData = await analyzeListingUrl(url);

    // Create a scan record for this manual analysis
    const scan = createScan({ item_id: itemId, platform: 'manual' });

    // Run AI analysis
    const resolvePhotoPath = (p) =>
      path.join(__dirname, '..', '..', p.replace(/^\//, ''));

    const absolutePhotoPaths = (item.photos || []).map(resolvePhotoPath);
    let result;

    // Try image analysis first
    if (absolutePhotoPaths.length > 0 && listingData.images.length > 0) {
      try {
        result = await analyzeImageMatch(
          absolutePhotoPaths,
          listingData.images,
          item.description || item.name
        );
      } catch (err) {
        console.warn('Image analysis failed for manual URL, falling back to description:', err.message);
      }
    }

    // Fall back to description analysis
    if (!result) {
      const profile = item.structured_profile || {
        name: item.name,
        category: item.category,
        description: item.description,
      };
      result = await analyzeDescriptionMatch(profile, listingData.title, listingData.description);
    }

    // Save the listing
    const listing = createListing({
      item_id: itemId,
      scan_id: scan.id,
      platform: 'manual',
      listing_id: null,
      url: listingData.url,
      title: listingData.title,
      description: listingData.description,
      price: null,
      location: null,
      images: listingData.images,
      match_score: result.score,
      ai_analysis: result.analysis,
    });

    // Update scan record
    const flagged = (result.score === 'high' || result.score === 'possible') ? 1 : 0;
    updateScan(scan.id, { listings_found: 1, matches_flagged: flagged });

    res.json({
      listing,
      analysis: result,
    });
  } catch (err) {
    console.error('Error analyzing URL:', err);
    res.status(500).json({ error: 'Failed to analyze listing URL', details: err.message });
  }
});

export default router;
