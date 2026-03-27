import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getItem,
  createScan,
  getScansForItem,
  updateScan,
  createListing,
} from '../db/queries.js';
import {
  generateKeywords,
  analyzeImageMatch,
  analyzeDescriptionMatch,
} from '../ai/matcher.js';
import { searchEbay } from '../scrapers/ebay.js';
import { searchCraigslist } from '../scrapers/craigslist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * Run a full scan for an item across all platforms.
 * This is the core scanning logic used by both manual triggers and the scheduler.
 */
export async function runScanForItem(itemId) {
  const item = getItem(itemId);
  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  if (!item.active) {
    console.log(`Item ${itemId} is not active - skipping scan`);
    return null;
  }

  console.log(`Starting scan for item: ${item.name} (ID: ${itemId})`);

  // Step 1: Generate search keywords
  let keywords;
  try {
    keywords = await generateKeywords(item);
  } catch (err) {
    console.error('Keyword generation failed, using fallback:', err.message);
    keywords = [item.name];
    if (item.category) keywords.push(`${item.category} ${item.name}`);
  }
  console.log(`Generated keywords: ${keywords.join(', ')}`);

  // Step 2: Search platforms in parallel
  const [ebayResults, craigslistResults] = await Promise.allSettled([
    searchEbay(keywords, item.city, item.search_radius),
    searchCraigslist(keywords, item.city),
  ]);

  const ebayListings = ebayResults.status === 'fulfilled' ? ebayResults.value : [];
  const craigslistListings = craigslistResults.status === 'fulfilled' ? craigslistResults.value : [];

  if (ebayResults.status === 'rejected') {
    console.error('eBay search failed:', ebayResults.reason);
  }
  if (craigslistResults.status === 'rejected') {
    console.error('Craigslist search failed:', craigslistResults.reason);
  }

  // Step 3: Create scan records
  const ebayScan = createScan({ item_id: itemId, platform: 'ebay' });
  const craigslistScan = createScan({ item_id: itemId, platform: 'craigslist' });

  // Step 4: Analyze each listing with AI and save results
  const resolvePhotoPath = (p) =>
    path.join(__dirname, '..', '..', p.replace(/^\//, ''));

  const absolutePhotoPaths = (item.photos || []).map(resolvePhotoPath);

  let ebayMatchCount = 0;
  let clMatchCount = 0;

  // Process eBay listings
  for (const listing of ebayListings) {
    try {
      const result = await analyzeListing(item, absolutePhotoPaths, listing);
      createListing({
        item_id: itemId,
        scan_id: ebayScan.id,
        platform: 'ebay',
        listing_id: listing.listingId,
        url: listing.url,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        location: listing.location,
        images: listing.images,
        match_score: result.score,
        ai_analysis: result.analysis,
      });
      if (result.score === 'high' || result.score === 'possible') {
        ebayMatchCount++;
      }
    } catch (err) {
      console.error(`Error analyzing eBay listing ${listing.listingId}:`, err.message);
    }
  }

  // Process Craigslist listings
  for (const listing of craigslistListings) {
    try {
      const result = await analyzeListing(item, absolutePhotoPaths, listing);
      createListing({
        item_id: itemId,
        scan_id: craigslistScan.id,
        platform: 'craigslist',
        listing_id: listing.listingId,
        url: listing.url,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        location: listing.location,
        images: listing.images,
        match_score: result.score,
        ai_analysis: result.analysis,
      });
      if (result.score === 'high' || result.score === 'possible') {
        clMatchCount++;
      }
    } catch (err) {
      console.error(`Error analyzing CL listing ${listing.listingId}:`, err.message);
    }
  }

  // Step 5: Update scan records with counts
  updateScan(ebayScan.id, { listings_found: ebayListings.length, matches_flagged: ebayMatchCount });
  updateScan(craigslistScan.id, { listings_found: craigslistListings.length, matches_flagged: clMatchCount });

  const summary = {
    item_id: itemId,
    keywords,
    ebay: { found: ebayListings.length, flagged: ebayMatchCount },
    craigslist: { found: craigslistListings.length, flagged: clMatchCount },
    total_found: ebayListings.length + craigslistListings.length,
    total_flagged: ebayMatchCount + clMatchCount,
  };

  console.log(`Scan complete for "${item.name}": ${summary.total_found} listings found, ${summary.total_flagged} flagged`);
  return summary;
}

/**
 * Analyze a single listing against the item using AI.
 * Uses image analysis if both sides have images, falls back to description analysis.
 */
async function analyzeListing(item, absolutePhotoPaths, listing) {
  // Try image analysis first if both have images
  if (absolutePhotoPaths.length > 0 && listing.images && listing.images.length > 0) {
    try {
      return await analyzeImageMatch(
        absolutePhotoPaths,
        listing.images,
        item.description || item.name
      );
    } catch (err) {
      console.warn('Image analysis failed, falling back to description:', err.message);
    }
  }

  // Fall back to description-based analysis
  if (item.structured_profile || item.description) {
    const profile = item.structured_profile || {
      name: item.name,
      category: item.category,
      description: item.description,
    };
    return await analyzeDescriptionMatch(profile, listing.title, listing.description);
  }

  // Minimal fallback
  return { score: 'possible', analysis: 'Insufficient data for automated analysis. Manual review recommended.' };
}

/**
 * POST /api/scans/:itemId
 * Trigger a manual scan for an item.
 */
router.post('/:itemId', async (req, res) => {
  try {
    const item = getItem(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = await runScanForItem(req.params.itemId);
    res.json(result);
  } catch (err) {
    console.error('Error running scan:', err);
    res.status(500).json({ error: 'Failed to run scan', details: err.message });
  }
});

/**
 * GET /api/scans/:itemId
 * Get scan history for an item.
 */
router.get('/:itemId', (req, res) => {
  try {
    const item = getItem(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const scans = getScansForItem(req.params.itemId);
    res.json(scans);
  } catch (err) {
    console.error('Error fetching scans:', err);
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

export default router;
