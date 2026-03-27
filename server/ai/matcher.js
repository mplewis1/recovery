import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Reads a local image file and returns a base64-encoded data object
 * suitable for the Anthropic vision API.
 */
function loadImageAsBase64(filePath) {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  const base64 = buffer.toString('base64');

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mediaType = mimeMap[ext] || 'image/jpeg';

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: base64,
    },
  };
}

/**
 * Creates an image content block from a URL.
 */
function imageFromUrl(url) {
  return {
    type: 'image',
    source: {
      type: 'url',
      url,
    },
  };
}

/**
 * Analyzes visual similarity between reference photos and listing images.
 */
export async function analyzeImageMatch(referencePhotoPaths, listingImageUrls, itemDescription) {
  try {
    const content = [];

    content.push({
      type: 'text',
      text: `You are an expert at identifying stolen or missing items being resold online.

REFERENCE ITEM DESCRIPTION: ${itemDescription || 'No description provided.'}

Below are reference photos of the item we are looking for, followed by photos from an online listing. Compare them carefully.

REFERENCE PHOTOS:`,
    });

    // Add reference photos (local files)
    for (const photoPath of referencePhotoPaths) {
      try {
        content.push(loadImageAsBase64(photoPath));
      } catch (err) {
        console.warn(`Could not load reference photo ${photoPath}:`, err.message);
      }
    }

    content.push({
      type: 'text',
      text: 'LISTING PHOTOS:',
    });

    // Add listing images (URLs)
    for (const url of listingImageUrls) {
      try {
        content.push(imageFromUrl(url));
      } catch (err) {
        console.warn(`Could not load listing image ${url}:`, err.message);
      }
    }

    content.push({
      type: 'text',
      text: `Compare the reference photos to the listing photos. Consider:
- Overall shape, color, size, and design
- Distinctive marks, scratches, stickers, or modifications
- Brand and model if visible
- Any unique identifying features

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "score": "high" | "possible" | "unlikely",
  "analysis": "detailed explanation of your reasoning"
}

Be conservative in your matching. If there is reasonable visual similarity but you cannot be certain, use "possible". Only use "high" when distinctive identifying features match. Prefer "possible" over "unlikely" when there is any meaningful resemblance.`,
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Image match analysis failed:', err.message);
    return { score: 'possible', analysis: `Analysis failed: ${err.message}. Marked as possible for manual review.` };
  }
}

/**
 * Analyzes text-based similarity between a structured item profile and a listing.
 */
export async function analyzeDescriptionMatch(structuredProfile, listingTitle, listingDescription) {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an expert at identifying stolen or missing items being resold online.

ITEM PROFILE:
${JSON.stringify(structuredProfile, null, 2)}

LISTING TITLE: ${listingTitle || 'N/A'}
LISTING DESCRIPTION: ${listingDescription || 'N/A'}

Compare the item profile to the listing. Consider:
- Brand, model, color, size matches
- Condition and distinctive features
- Whether the listing could plausibly be the same item
- Price anomalies (suspiciously low price for the item)

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "score": "high" | "possible" | "unlikely",
  "analysis": "detailed explanation of your reasoning"
}

Be conservative. Prefer "possible" over "unlikely" when there is any meaningful overlap in characteristics.`,
      }],
    });

    const text = response.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Description match analysis failed:', err.message);
    return { score: 'possible', analysis: `Analysis failed: ${err.message}. Marked as possible for manual review.` };
  }
}

/**
 * Generates a structured search profile from item info and photos.
 */
export async function generateSearchProfile(description, photos) {
  try {
    const content = [];

    content.push({
      type: 'text',
      text: `You are helping someone search for a stolen or lost item on online marketplaces.

ITEM DESCRIPTION: ${description}

Generate a structured search profile for this item. Include all details that would help identify it in marketplace listings.`,
    });

    // Include photos if available
    if (photos && photos.length > 0) {
      content.push({ type: 'text', text: 'REFERENCE PHOTOS:' });
      for (const photoPath of photos) {
        try {
          content.push(loadImageAsBase64(photoPath));
        } catch (err) {
          console.warn(`Could not load photo ${photoPath}:`, err.message);
        }
      }
    }

    content.push({
      type: 'text',
      text: `Based on the description and any photos, respond with ONLY valid JSON (no markdown, no code fences):
{
  "brand": "brand name or null",
  "model": "model name/number or null",
  "category": "general category (e.g., electronics, jewelry, bicycle, instrument)",
  "color": "primary color(s)",
  "size": "size description or null",
  "condition": "condition notes or null",
  "distinguishing_features": ["list of unique identifying marks, scratches, modifications, etc."],
  "estimated_value": "estimated resale value range or null",
  "keywords": ["array", "of", "search", "terms", "to", "use"],
  "keyword_variants": ["alternate spellings", "abbreviations", "common misspellings"]
}`,
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].text.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Search profile generation failed:', err.message);
    return null;
  }
}

/**
 * Generates an array of keyword search strings for marketplace searches.
 */
export async function generateKeywords(item) {
  try {
    // If we already have a structured profile with keywords, use those as a starting point
    const profile = item.structured_profile;
    const profileContext = profile ? `\nEXISTING PROFILE: ${JSON.stringify(profile)}` : '';

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Generate search keywords for finding this item on online marketplaces (eBay, Craigslist, Facebook Marketplace).

ITEM NAME: ${item.name}
CATEGORY: ${item.category || 'unknown'}
DESCRIPTION: ${item.description || 'none'}${profileContext}

Return ONLY a JSON array of 3-8 search query strings. Each should be a realistic marketplace search query (2-5 words). Include variations with and without brand names, model numbers, common abbreviations.

Example: ["MacBook Pro 2023", "Apple laptop 16 inch", "MacBook Pro M3", "MBP 16"]

Respond with ONLY the JSON array (no markdown, no code fences).`,
      }],
    });

    const text = response.content[0].text.trim();
    const keywords = JSON.parse(text);
    return Array.isArray(keywords) ? keywords : [item.name];
  } catch (err) {
    console.error('Keyword generation failed:', err.message);
    // Fallback: use the item name and category
    const fallback = [item.name];
    if (item.category) fallback.push(`${item.category} ${item.name}`);
    return fallback;
  }
}
