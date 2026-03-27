/**
 * Analyze a manually provided listing URL by fetching its HTML and
 * extracting key metadata.
 *
 * @param {string} url - The listing URL to analyze
 * @returns {{ title: string, description: string, images: string[], url: string }}
 */
export async function analyzeListingUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, ' ').trim()
      : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch
      ? descMatch[1].replace(/\s+/g, ' ').trim()
      : '';

    // Extract og:image(s)
    const images = [];
    const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    const ogImageRegex2 = /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/gi;

    let match;
    while ((match = ogImageRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    while ((match = ogImageRegex2.exec(html)) !== null) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
    }

    // Also try to find images from twitter:image
    const twitterImageRegex = /<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    while ((match = twitterImageRegex.exec(html)) !== null) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
    }

    // Try finding product images from common patterns if no og:image found
    if (images.length === 0) {
      const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
      const allImgs = [];
      while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1];
        // Filter for likely product images (skip icons, tracking pixels, etc.)
        if (src.match(/\.(jpg|jpeg|png|webp)/i) && !src.match(/(icon|logo|pixel|tracking|badge|button)/i)) {
          allImgs.push(src);
        }
      }
      // Take first 5 likely product images
      images.push(...allImgs.slice(0, 5));
    }

    return {
      title,
      description,
      images,
      url,
    };
  } catch (err) {
    console.error(`Failed to analyze listing URL ${url}:`, err.message);
    return {
      title: '',
      description: '',
      images: [],
      url,
    };
  }
}
