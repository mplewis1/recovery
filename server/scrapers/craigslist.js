import { parseStringPromise } from 'xml2js';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search Craigslist listings via RSS feed.
 *
 * @param {string[]} keywords - Array of search keyword strings
 * @param {string} city - Craigslist city subdomain (e.g., 'sfbay', 'newyork', 'losangeles')
 * @returns {Array<{listingId, title, description, price, location, url, images}>}
 */
export async function searchCraigslist(keywords, city) {
  if (!city) {
    console.warn('No city provided for Craigslist search - skipping');
    return [];
  }

  // Normalize city to craigslist subdomain format (lowercase, no spaces)
  const subdomain = city.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  const allResults = [];
  const seenIds = new Set();

  for (const keyword of keywords) {
    try {
      const encodedQuery = encodeURIComponent(keyword);
      const url = `https://${subdomain}.craigslist.org/search/sss?format=rss&query=${encodedQuery}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RecoverWatch/1.0 (item recovery tool)',
        },
      });

      if (!response.ok) {
        console.error(`Craigslist search failed for "${keyword}" in ${subdomain}:`, response.status);
        await delay(3000);
        continue;
      }

      const xml = await response.text();
      const parsed = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: false,
      });

      // RSS feed structure: rdf:RDF > item (array or single)
      let items = [];
      const root = parsed['rdf:RDF'] || parsed.rss?.channel;

      if (root) {
        const rawItems = root.item;
        if (Array.isArray(rawItems)) {
          items = rawItems;
        } else if (rawItems) {
          items = [rawItems];
        }
      }

      for (const item of items) {
        // Extract a stable ID from the link
        const link = item.link || item['$']?.['rdf:about'] || '';
        const idMatch = link.match(/\/(\d+)\.html/);
        const listingId = idMatch ? idMatch[1] : link;

        if (seenIds.has(listingId)) continue;
        seenIds.add(listingId);

        // Extract description (may contain HTML)
        const rawDesc = item.description || item['dc:description'] || '';
        const description = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract images from enc:enclosure or enclosure
        const images = [];
        const enclosure = item['enc:enclosure'] || item.enclosure;
        if (enclosure) {
          const enclosures = Array.isArray(enclosure) ? enclosure : [enclosure];
          for (const enc of enclosures) {
            const resource = enc?.['$']?.['rdf:resource'] || enc?.['$']?.url || enc?.url;
            if (resource && /\.(jpg|jpeg|png|gif|webp)/i.test(resource)) {
              images.push(resource);
            }
          }
        }

        // Price - try to extract from dc:price or from title
        let price = '';
        if (item['dc:price']) {
          price = item['dc:price'];
        } else {
          const priceMatch = (item.title || '').match(/\$[\d,.]+/);
          if (priceMatch) price = priceMatch[0];
        }

        // Location
        const location = item['dc:source'] || item['dc:coverage'] || '';

        allResults.push({
          listingId,
          title: (item.title || '').replace(/\s+/g, ' ').trim(),
          description,
          price,
          location,
          url: link,
          images,
        });
      }

      // Rate limit: 3 seconds between requests
      await delay(3000);
    } catch (err) {
      console.error(`Craigslist search error for "${keyword}":`, err.message);
      await delay(3000);
    }
  }

  return allResults;
}
