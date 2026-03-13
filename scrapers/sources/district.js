/**
 * District (district.in) — JSON-LD scraper
 *
 * Step 1: Playwright fetches the listing page (JS-rendered) to collect event URLs
 * Step 2: Each event page is fetched with native fetch() in parallel,
 *         and structured data is extracted from the JSON-LD <script> tag
 *         (Schema.org Event — includes lat/lng, price, dates, image)
 */

import { chromium } from 'playwright'

const CITY_SLUGS = {
  Mumbai: 'mumbai',
  Delhi: 'delhi-ncr',
  Bengaluru: 'bengaluru',
  Hyderabad: 'hyderabad',
  Chennai: 'chennai',
  Pune: 'pune',
  Kolkata: 'kolkata',
  Ahmedabad: 'ahmedabad',
  Goa: 'goa',
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const CONCURRENT_TABS = 5

// Extract JSON-LD from a Playwright page
async function extractJsonLd(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(2000)
  try {
    return await page.$eval(
      'script[type="application/ld+json"]',
      (el) => JSON.parse(el.textContent)
    )
  } catch {
    return null
  }
}

// Get all event URLs from listing page + collect JSON-LD in one browser session
async function scrapeWithBrowser(citySlug) {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })

    // Step 1: get event URLs from listing page
    const listPage = await context.newPage()
    await listPage.goto(`https://district.in/events?city=${citySlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await listPage.waitForTimeout(4000)

    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await listPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await listPage.waitForTimeout(1500)
    }

    const eventUrls = await listPage.$$eval('a[href*="/events/"]', (els) =>
      [
        ...new Set(
          els
            .map((el) => el.href)
            .filter((h) => h.includes('/events/') && h !== 'https://www.district.in/events/')
        ),
      ]
    )
    await listPage.close()

    if (eventUrls.length === 0) return []

    // Step 2: fetch each event page in parallel batches using multiple tabs
    const results = []
    for (let i = 0; i < eventUrls.length; i += CONCURRENT_TABS) {
      const batch = eventUrls.slice(i, i + CONCURRENT_TABS)
      const pages = await Promise.all(batch.map(() => context.newPage()))

      const settled = await Promise.allSettled(
        pages.map((p, idx) => extractJsonLd(p, batch[idx]))
      )

      await Promise.all(pages.map((p) => p.close()))

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled' && outcome.value) {
          results.push(outcome.value)
        }
      }
    }

    return results
  } finally {
    await browser.close()
  }
}

// Map JSON-LD Event schema to our DB shape
function mapJsonLd(ld, city) {
  const geo = ld.location?.geo
  if (!geo?.latitude || !geo?.longitude) return null

  const offers = ld.offers
  const priceMin = offers?.lowPrice ?? offers?.price ?? null
  const priceMax = offers?.highPrice ?? offers?.price ?? null
  const currency = offers?.priceCurrency ?? offers?.offers?.[0]?.priceCurrency ?? 'INR'

  const keywords = ld.keywords?.content || ''
  const categoryName = keywords.split(',')[1]?.trim() || 'Events'

  return {
    venue: {
      name: ld.location.name || 'Unknown Venue',
      address: ld.location.address || '',
      city,
      latitude: parseFloat(geo.latitude),
      longitude: parseFloat(geo.longitude),
    },
    event: {
      title: ld.name || 'Untitled',
      description: ld.description?.replace(/&nbsp;/g, ' ').trim() || null,
      category_name: categoryName,
      city,
      start_time: ld.startDate ?? null,
      end_time: ld.endDate ?? null,
      price_min: priceMin,
      price_max: priceMax,
      currency,
      source_platform: 'district',
      source_url: ld.url || '',
      image_url: ld.image || null,
      popularity_score: 0,
      external_id: `district_${ld.url?.split('/events/')?.[1]?.replace('-buy-tickets', '') ?? ld.name}`,
    },
  }
}

export async function scrapeDistrict(city) {
  const citySlug = CITY_SLUGS[city]
  if (!citySlug) {
    console.warn(`[District] No city slug for "${city}" — skipping`)
    return []
  }

  let ldItems = []
  try {
    ldItems = await scrapeWithBrowser(citySlug)
    console.log(`[District] Fetched ${ldItems.length} event pages for ${city}`)
  } catch (err) {
    console.error(`[District] Browser failed for ${city}: ${err.message}`)
    return []
  }

  return ldItems.map((ld) => mapJsonLd(ld, city)).filter(Boolean)
}
