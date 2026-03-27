import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getItem, getListingsForItem, getScansForItem } from '../db/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * Convert a local image file to a base64 data URI for embedding in HTML.
 */
function imageToDataUri(relativePath) {
  try {
    const absolutePath = path.join(__dirname, '..', '..', relativePath.replace(/^\//, ''));
    if (!fs.existsSync(absolutePath)) return null;

    const buffer = fs.readFileSync(absolutePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /api/export/:itemId
 * Generate an HTML report for an item with all flagged listings.
 * The HTML is designed to be printed to PDF from the browser.
 */
router.get('/:itemId', (req, res) => {
  try {
    const item = getItem(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const listings = getListingsForItem(req.params.itemId);
    const scans = getScansForItem(req.params.itemId);

    // Filter to only flagged listings (high or possible matches)
    const flaggedListings = listings.filter(l => l.match_score === 'high' || l.match_score === 'possible');

    // Build reference photo HTML
    const photoHtml = (item.photos || []).map(p => {
      const dataUri = imageToDataUri(p);
      if (dataUri) {
        return `<img src="${dataUri}" alt="Reference photo" style="max-width:300px;max-height:300px;margin:5px;border:1px solid #ccc;border-radius:4px;">`;
      }
      return `<span style="color:#999;">[Photo unavailable: ${escapeHtml(p)}]</span>`;
    }).join('\n');

    // Build listings HTML
    const listingsHtml = flaggedListings.map((listing, i) => {
      const scoreColor = listing.match_score === 'high' ? '#dc2626' : '#f59e0b';
      const scoreLabel = listing.match_score === 'high' ? 'HIGH MATCH' : 'POSSIBLE MATCH';

      const listingImages = (listing.images || []).map(url =>
        `<img src="${escapeHtml(url)}" alt="Listing image" style="max-width:200px;max-height:200px;margin:3px;border:1px solid #ddd;border-radius:4px;" onerror="this.style.display='none'">`
      ).join('\n');

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="margin:0;font-size:16px;">#${i + 1}: ${escapeHtml(listing.title)}</h3>
            <span style="background:${scoreColor};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:bold;">${scoreLabel}</span>
          </div>
          <table style="width:100%;font-size:14px;margin-bottom:8px;">
            <tr><td style="width:100px;color:#6b7280;padding:2px 0;"><strong>Platform:</strong></td><td>${escapeHtml(listing.platform)}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 0;"><strong>Price:</strong></td><td>${escapeHtml(listing.price) || 'N/A'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 0;"><strong>Location:</strong></td><td>${escapeHtml(listing.location) || 'N/A'}</td></tr>
            <tr><td style="color:#6b7280;padding:2px 0;"><strong>URL:</strong></td><td><a href="${escapeHtml(listing.url)}" style="color:#2563eb;">${escapeHtml(listing.url)}</a></td></tr>
            <tr><td style="color:#6b7280;padding:2px 0;"><strong>Flagged:</strong></td><td>${escapeHtml(listing.flagged_at)}</td></tr>
          </table>
          ${listing.description ? `<p style="font-size:13px;color:#374151;margin:8px 0;"><strong>Description:</strong> ${escapeHtml(listing.description).substring(0, 500)}</p>` : ''}
          ${listingImages ? `<div style="margin:8px 0;">${listingImages}</div>` : ''}
          ${listing.ai_analysis ? `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:10px;margin-top:8px;">
              <strong style="font-size:13px;color:#4b5563;">AI Analysis:</strong>
              <p style="font-size:13px;color:#374151;margin:4px 0 0 0;">${escapeHtml(listing.ai_analysis)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('\n');

    // Build structured profile section
    let profileHtml = '';
    if (item.structured_profile) {
      const profile = item.structured_profile;
      profileHtml = `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:20px;">
          <h3 style="margin:0 0 8px 0;font-size:16px;color:#0369a1;">Structured Profile</h3>
          <table style="width:100%;font-size:14px;">
            ${profile.brand ? `<tr><td style="width:140px;color:#6b7280;padding:2px 0;"><strong>Brand:</strong></td><td>${escapeHtml(profile.brand)}</td></tr>` : ''}
            ${profile.model ? `<tr><td style="color:#6b7280;padding:2px 0;"><strong>Model:</strong></td><td>${escapeHtml(profile.model)}</td></tr>` : ''}
            ${profile.category ? `<tr><td style="color:#6b7280;padding:2px 0;"><strong>Category:</strong></td><td>${escapeHtml(profile.category)}</td></tr>` : ''}
            ${profile.color ? `<tr><td style="color:#6b7280;padding:2px 0;"><strong>Color:</strong></td><td>${escapeHtml(profile.color)}</td></tr>` : ''}
            ${profile.estimated_value ? `<tr><td style="color:#6b7280;padding:2px 0;"><strong>Est. Value:</strong></td><td>${escapeHtml(profile.estimated_value)}</td></tr>` : ''}
            ${profile.distinguishing_features?.length ? `<tr><td style="color:#6b7280;padding:2px 0;vertical-align:top;"><strong>Features:</strong></td><td>${profile.distinguishing_features.map(f => escapeHtml(f)).join(', ')}</td></tr>` : ''}
          </table>
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RecoverWatch Report - ${escapeHtml(item.name)}</title>
  <style>
    @media print {
      body { margin: 0; font-size: 12px; }
      .no-print { display: none; }
      a { color: #2563eb; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #111827;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:20px;text-align:center;">
    Use your browser's Print function (Ctrl/Cmd+P) to save this report as a PDF.
  </div>

  <header style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:24px;">RecoverWatch Report</h1>
    <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</p>
  </header>

  <section style="margin-bottom:24px;">
    <h2 style="font-size:20px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Item Details</h2>
    <table style="width:100%;font-size:14px;">
      <tr><td style="width:140px;color:#6b7280;padding:4px 0;"><strong>Name:</strong></td><td>${escapeHtml(item.name)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>Category:</strong></td><td>${escapeHtml(item.category) || 'N/A'}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>Status:</strong></td><td style="text-transform:capitalize;">${escapeHtml(item.status)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>City:</strong></td><td>${escapeHtml(item.city) || 'N/A'}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>Search Radius:</strong></td><td>${item.search_radius} miles</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>Registered:</strong></td><td>${escapeHtml(item.created_at)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;"><strong>Total Scans:</strong></td><td>${scans.length}</td></tr>
    </table>
    ${item.description ? `<p style="margin:12px 0 0 0;font-size:14px;"><strong>Description:</strong> ${escapeHtml(item.description)}</p>` : ''}
  </section>

  ${photoHtml ? `
  <section style="margin-bottom:24px;">
    <h2 style="font-size:20px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Reference Photos</h2>
    <div style="display:flex;flex-wrap:wrap;">${photoHtml}</div>
  </section>
  ` : ''}

  ${profileHtml}

  <section style="margin-bottom:24px;">
    <h2 style="font-size:20px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
      Flagged Listings (${flaggedListings.length})
    </h2>
    ${flaggedListings.length === 0
      ? '<p style="color:#6b7280;font-style:italic;">No flagged listings found yet.</p>'
      : listingsHtml
    }
  </section>

  <footer style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:24px;color:#9ca3af;font-size:12px;text-align:center;">
    RecoverWatch - Automated Stolen Property Recovery Tool
  </footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Error generating export:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
