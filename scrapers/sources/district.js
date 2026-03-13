/**
 * District (district.in) — JSON-LD scraper
 *
 * Step 1: Playwright fetches the listing page (JS-rendered) to collect event URLs
 * Step 2: Each event page is fetched with native fetch() in parallel,
 *         and structured data is extracted from the JSON-LD <script> tag
 *         (Schema.org Event — includes lat/lng, price, dates, image)
 */

import { chromium } from 'playwright'

// Search term to use in district.in's city picker
const CITY_SEARCH = {
  Mumbai: 'Mumbai, Maharashtra',
  Delhi: 'Delhi/NCR, Delhi',
  Bengaluru: 'Bengaluru, Karnataka',
  Hyderabad: 'Hyderabad, Telangana',
  Chennai: 'Chennai, Tamil Nadu',
  Pune: 'Pune, Maharashtra',
  Kolkata: 'Kolkata, West Bengal',
  Ahmedabad: 'Ahmedabad, Gujarat',
  Goa: 'Goa, India',
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

// Select a city using the district.in city picker modal
async function selectCity(page, citySearchTerm) {
  // Click the city button (always first button on the page)
  await page.click('button:first-of-type')
  await page.waitForTimeout(1500)

  // Type the city name in the search box
  await page.fill('input[placeholder*="Search city"]', citySearchTerm.split(',')[0])
  await page.waitForTimeout(1500)

  // Click the exact matching result (e.g. "Mumbai, Maharashtra")
  try {
    await page.click(`text="${citySearchTerm}"`, { timeout: 3000 })
  } catch {
    // Fallback: click first result containing the city name
    await page.click(`text="${citySearchTerm.split(',')[0]}"`, { timeout: 3000 })
  }
  await page.waitForTimeout(2500)
}

// Get all event URLs from listing page + collect JSON-LD in one browser session
async function scrapeWithBrowser(city) {
  const citySearchTerm = CITY_SEARCH[city]
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })

    // Step 1: get event URLs from listing page
    const listPage = await context.newPage()
    await listPage.goto('https://district.in/events', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await listPage.waitForTimeout(4000)

    // Select the target city via the city picker
    await selectCity(listPage, citySearchTerm)

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

  // @type can be 'MusicEvent', 'ComedyEvent', 'SportsEvent', etc.
  // Otherwise parse the keywords string: "Events, Music & Nightlife, Mumbai, ..."
  const ldType = Array.isArray(ld['@type']) ? ld['@type'][0] : ld['@type']
  let categoryName = 'Events'
  if (ldType && ldType !== 'Event') {
    categoryName = ldType.replace(/Event$/, '').trim() || 'Events'
  } else {
    const rawKw = typeof ld.keywords === 'string'
      ? ld.keywords
      : Array.isArray(ld.keywords) ? ld.keywords.join(', ') : ''
    categoryName = rawKw.split(',')[1]?.trim() || 'Events'
  }

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
  if (!CITY_SEARCH[city]) {
    console.warn(`[District] No city config for "${city}" — skipping`)
    return []
  }

  let ldItems = []
  try {
    ldItems = await scrapeWithBrowser(city)
    console.log(`[District] Fetched ${ldItems.length} event pages for ${city}`)
  } catch (err) {
    console.error(`[District] Browser failed for ${city}: ${err.message}`)
    return []
  }

  return ldItems.map((ld) => mapJsonLd(ld, city)).filter(Boolean)
}
