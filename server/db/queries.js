import db from './schema.js';

// ─── Items ───────────────────────────────────────────────────────────────────

export function createItem({ name, category, description, photos, structured_profile, city, search_radius, scan_frequency }) {
  const stmt = db.prepare(`
    INSERT INTO items (name, category, description, photos, structured_profile, city, search_radius, scan_frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name,
    category || null,
    description || null,
    JSON.stringify(photos || []),
    structured_profile ? JSON.stringify(structured_profile) : null,
    city || null,
    search_radius ?? 50,
    scan_frequency || 'daily'
  );
  return getItem(result.lastInsertRowid);
}

export function getItems() {
  const rows = db.prepare(`
    SELECT
      i.*,
      (SELECT COUNT(*) FROM scans s WHERE s.item_id = i.id) AS scan_count,
      (SELECT COUNT(*) FROM listings l WHERE l.item_id = i.id AND l.match_score = 'high') AS high_matches,
      (SELECT COUNT(*) FROM listings l WHERE l.item_id = i.id AND l.match_score = 'possible') AS possible_matches,
      (SELECT MAX(s.ran_at) FROM scans s WHERE s.item_id = i.id) AS last_scan
    FROM items i
    ORDER BY i.created_at DESC
  `).all();
  return rows.map(parseItemRow);
}

export function getItem(id) {
  const row = db.prepare(`
    SELECT
      i.*,
      (SELECT COUNT(*) FROM scans s WHERE s.item_id = i.id) AS scan_count,
      (SELECT COUNT(*) FROM listings l WHERE l.item_id = i.id AND l.match_score = 'high') AS high_matches,
      (SELECT COUNT(*) FROM listings l WHERE l.item_id = i.id AND l.match_score = 'possible') AS possible_matches,
      (SELECT MAX(s.ran_at) FROM scans s WHERE s.item_id = i.id) AS last_scan
    FROM items i
    WHERE i.id = ?
  `).get(id);
  return row ? parseItemRow(row) : null;
}

export function updateItem(id, fields) {
  const allowed = ['name', 'category', 'description', 'photos', 'structured_profile', 'city', 'search_radius', 'scan_frequency', 'active', 'status'];
  const updates = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      if (key === 'photos' && Array.isArray(fields[key])) {
        values.push(JSON.stringify(fields[key]));
      } else if (key === 'structured_profile' && typeof fields[key] === 'object') {
        values.push(JSON.stringify(fields[key]));
      } else {
        values.push(fields[key]);
      }
    }
  }

  if (updates.length === 0) return getItem(id);

  values.push(id);
  db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getItem(id);
}

export function deleteItem(id) {
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
}

export function markRecovered(id) {
  db.prepare("UPDATE items SET status = 'recovered', active = 0 WHERE id = ?").run(id);
  return getItem(id);
}

// ─── Scans ───────────────────────────────────────────────────────────────────

export function createScan({ item_id, platform }) {
  const result = db.prepare(`
    INSERT INTO scans (item_id, platform) VALUES (?, ?)
  `).run(item_id, platform);
  return db.prepare('SELECT * FROM scans WHERE id = ?').get(result.lastInsertRowid);
}

export function getScansForItem(itemId) {
  return db.prepare('SELECT * FROM scans WHERE item_id = ? ORDER BY ran_at DESC').all(itemId);
}

export function updateScan(id, { listings_found, matches_flagged }) {
  db.prepare('UPDATE scans SET listings_found = ?, matches_flagged = ? WHERE id = ?')
    .run(listings_found ?? 0, matches_flagged ?? 0, id);
  return db.prepare('SELECT * FROM scans WHERE id = ?').get(id);
}

// ─── Listings ────────────────────────────────────────────────────────────────

export function createListing({ item_id, scan_id, platform, listing_id, url, title, description, price, location, images, match_score, ai_analysis }) {
  const result = db.prepare(`
    INSERT INTO listings (item_id, scan_id, platform, listing_id, url, title, description, price, location, images, match_score, ai_analysis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item_id,
    scan_id || null,
    platform || null,
    listing_id || null,
    url || null,
    title || null,
    description || null,
    price || null,
    location || null,
    JSON.stringify(images || []),
    match_score || null,
    ai_analysis || null
  );
  return db.prepare('SELECT * FROM listings WHERE id = ?').get(result.lastInsertRowid);
}

export function getListingsForItem(itemId, { match_score, status } = {}) {
  let sql = 'SELECT * FROM listings WHERE item_id = ?';
  const params = [itemId];

  if (match_score) {
    sql += ' AND match_score = ?';
    params.push(match_score);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY flagged_at DESC';
  return db.prepare(sql).all(params).map(parseListingRow);
}

export function updateListingStatus(id, status) {
  db.prepare('UPDATE listings SET status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
}

export function getListingsByScore(score) {
  return db.prepare('SELECT * FROM listings WHERE match_score = ? ORDER BY flagged_at DESC')
    .all(score)
    .map(parseListingRow);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

export function updateSettings({ notification_email, smtp_host, smtp_port, smtp_user, smtp_pass }) {
  db.prepare(`
    UPDATE settings
    SET notification_email = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?
    WHERE id = 1
  `).run(
    notification_email || null,
    smtp_host || null,
    smtp_port || null,
    smtp_user || null,
    smtp_pass || null
  );
  return getSettings();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseItemRow(row) {
  if (!row) return null;
  return {
    ...row,
    photos: safeJsonParse(row.photos, []),
    structured_profile: safeJsonParse(row.structured_profile, null),
  };
}

function parseListingRow(row) {
  if (!row) return null;
  return {
    ...row,
    images: safeJsonParse(row.images, []),
  };
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
