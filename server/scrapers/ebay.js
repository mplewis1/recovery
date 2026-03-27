const EBAY_API_BASE = 'https://api.ebay.com';
const TOKEN_URL = `${EBAY_API_BASE}/identity/v1/oauth2/token`;
const SEARCH_URL = `${EBAY_API_BASE}/buy/browse/v1/item_summary/search`;

let cachedToken = null;
let tokenExpiry = 0;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtains an OAuth application token using client credentials grant.
 */
async function getToken() {
  const appId = process.env.EBAY_APP_ID;
  const appSecret = process.env.EBAY_APP_SECRET;

  if (!appId) {
    return null;
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${appId}:${appSecret || appId}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('eBay token request failed:', response.status, text);
    return null;
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

/**
 * Search eBay listings using the Browse API.
 *
 * @param {string[]} keywords - Array of search keyword strings
 * @param {string} city - City name (used for item location filter)
 * @param {number} radius - Search radius in miles
 * @returns {Array<{listingId, title, description, price, location, url, images}>}
 */
export async function searchEbay(keywords, city, radius) {
  if (!process.env.EBAY_APP_ID) {
    console.warn('EBAY_APP_ID not set - skipping eBay search');
    return [];
  }

  const token = await getToken();
  if (!token) {
    console.warn('Failed to obtain eBay OAuth token - skipping eBay search');
    return [];
  }

  const allResults = [];
  const seenIds = new Set();

  for (const keyword of keywords) {
    try {
      const params = new URLSearchParams({
        q: keyword,
        limit: '50',
      });

      // Add location filter if city is provided
      if (city) {
        params.set('filter', `buyerPostalCode:${city},deliveryCountry:US,maxDeliveryCost:0`);
      }

      const response = await fetch(`${SEARCH_URL}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'X-EBAY-C-ENDUSERCTX': city ? `contextualLocation=country=US,zip=${city}` : '',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`eBay search failed for "${keyword}":`, response.status, text);
        await delay(2000);
        continue;
      }

      const data = await response.json();
      const summaries = data.itemSummaries || [];

      for (const item of summaries) {
        const id = item.itemId;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        allResults.push({
          listingId: id,
          title: item.title || '',
          description: item.shortDescription || '',
          price: item.price ? `${item.price.currency} ${item.price.value}` : '',
          location: item.itemLocation
            ? `${item.itemLocation.city || ''}, ${item.itemLocation.stateOrProvince || ''} ${item.itemLocation.country || ''}`.trim()
            : '',
          url: item.itemWebUrl || item.itemHref || `https://www.ebay.com/itm/${id}`,
          images: item.thumbnailImages
            ? item.thumbnailImages.map(img => img.imageUrl)
            : item.image
              ? [item.image.imageUrl]
              : [],
        });
      }

      // Rate limit: 2 seconds between requests
      await delay(2000);
    } catch (err) {
      console.error(`eBay search error for "${keyword}":`, err.message);
      await delay(2000);
    }
  }

  return allResults;
}
