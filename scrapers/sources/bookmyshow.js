/**
 * BookMyShow — __INITIAL_STATE__ scraper
 *
 * Extracts all event data from window.__INITIAL_STATE__.explore.events.listings
 * on the BMS explore/events listing page. No individual event page visits needed
 * (avoids Cloudflare protection on detail pages).
 *
 * Dates are decoded from the base64-encoded text overlay embedded in image URLs.
 * e.g. ie-VGh1LCAxOSBNYXI%3D → base64 → "Thu, 19 Mar"
 */

import { chromium } from 'playwright'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const CITY_SLUG = {
  Mumbai:    'mumbai',
  Delhi:     'delhi',
  Bengaluru: 'bengaluru',
  Hyderabad: 'hyderabad',
  Chennai:   'chennai',
  Pune:      'pune',
  Kolkata:   'kolkata',
  Ahmedabad:  'ahmedabad',
  Goa:        'goa',
  Jaipur:     'jaipur',
  Kochi:      'kochi',
  Chandigarh: 'chandigarh',
  Lucknow:    'lucknow',
  Indore:     'indore',
}

// Fallback coordinates used for all BMS events (listing page has no venue lat/lng)
const CITY_CENTERS = {
  Mumbai:    { lat: 18.9388, lng: 72.8354 },
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Ahmedabad:  { lat: 23.0225, lng: 72.5714 },
  Goa:        { lat: 15.2993, lng: 74.1240 },
  Jaipur:     { lat: 26.9124, lng: 75.7873 },
  Kochi:      { lat:  9.9312, lng: 76.2673 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Lucknow:    { lat: 26.8467, lng: 80.9462 },
  Indore:     { lat: 22.7196, lng: 75.8577 },
}

// Decode all text overlays from a BMS image URL.
// BMS encodes multiple text layers as ie-{base64} — typically date then time.
// e.g. ie-VGh1LCAxOSBNYXI%3D → "Thu, 19 Mar", ie-Nzo0NSBQTQ%3D%3D → "7:45 PM"
function extractTextsFromImgUrl(imgUrl) {
  const results = []
  const regex = /ie-([A-Za-z0-9+/_%]+)/g
  let match
  while ((match = regex.exec(imgUrl)) !== null) {
    try {
      const decoded = Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8')
      if (decoded) results.push(decoded)
    } catch { /* skip */ }
  }
  return results
}

// Parse all decoded BMS text overlays into an ISO datetime string (IST = +05:30).
// Recognises date texts ("Thu, 19 Mar", "19 Mar onwards") and
// time texts ("7:45 PM", "7 PM", "10:30 AM") and combines them.
function parseDateTime(texts) {
  if (!texts.length) return null

  let dateText = null
  let timeText = null

  for (const t of texts) {
    if (/\d{1,2}(:\d{2})?\s*(AM|PM)/i.test(t)) {
      timeText = t.trim()
    } else if (/\d{1,2}\s+[A-Za-z]{3}/.test(t)) {
      dateText = t.trim()
    }
  }

  if (!dateText) return null

  // "Thu, 19 Mar" → "19 Mar" → reorder to "Mar 19" for reliable JS parsing
  const stripped = dateText
    .replace(/^[A-Za-z]{2,4},\s*/, '')
    .replace(/\s*(onwards|onward).*/i, '')
    .trim()
  const parts = stripped.split(/\s+/)
  const reordered = parts.length === 2 ? `${parts[1]} ${parts[0]}` : stripped

  const year = new Date().getFullYear()

  function buildDate(yr) {
    const str = timeText
      ? `${reordered} ${yr} ${timeText} +0530`
      : `${reordered} ${yr} +0530`
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  try {
    let d = buildDate(year)
    if (!d) return null
    // If more than 2 days in the past, the event is next year
    if (d < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) {
      d = buildDate(year + 1)
    }
    return d ? d.toISOString() : null
  } catch { return null }
}

// Parse "₹ 1999 onwards", "₹500 - ₹2000", "FREE"
function parsePrice(priceText) {
  if (!priceText) return { min: null, max: null }
  const t = priceText.trim()
  if (/^free$/i.test(t)) return { min: 0, max: 0 }
  const nums = t.match(/[\d,]+/g)?.map((n) => parseFloat(n.replace(/,/g, '')))
  if (!nums?.length) return { min: null, max: null }
  return { min: nums[0], max: nums[1] ?? null }
}

// Safely get text from a BMS card text block at a given index
function cardText(card, idx) {
  return card.text?.[idx]?.components?.[0]?.text?.trim() || ''
}

// Map a BMS listings card to our DB shape
function mapCard(card, city) {
  const ctaUrl = card.ctaUrl || ''
  const etMatch = ctaUrl.match(/\/(ET\d+)/i)
  if (!etMatch) return null

  const title = cardText(card, 0)
  if (!title) return null

  const venueRaw = cardText(card, 1)  // "Royal Opera House Theatre: Mumbai"
  const venueName = venueRaw.split(':')[0].trim() || 'Unknown Venue'

  const category = cardText(card, 2) || 'Events'
  const { min: priceMin, max: priceMax } = parsePrice(cardText(card, 3))

  const imgUrl = card.image?.url || null
  const startTime = parseDateTime(extractTextsFromImgUrl(imgUrl || ''))
  const center = CITY_CENTERS[city]

  return {
    venue: {
      name: venueName,
      address: venueRaw,
      city,
      latitude: center.lat,
      longitude: center.lng,
    },
    event: {
      title,
      description: null,
      category_name: category,
      city,
      start_time: startTime,
      end_time: null,
      price_min: priceMin,
      price_max: priceMax,
      currency: 'INR',
      source_platform: 'bookmyshow',
      source_url: ctaUrl,
      image_url: imgUrl,
      popularity_score: 0,
      external_id: `bms_${etMatch[1]}`,
    },
  }
}

export async function scrapeBookMyShow(city) {
  if (!CITY_SLUG[city]) {
    console.warn(`[BookMyShow] No city config for "${city}" — skipping`)
    return []
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ userAgent: UA })
    const page = await context.newPage()

    await page.goto(`https://in.bookmyshow.com/explore/events-${CITY_SLUG[city]}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await page.waitForTimeout(4000)
    try { await page.keyboard.press('Escape') } catch {}

    // Scroll to trigger lazy-loaded listings
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)
    }

    const listings = await page.evaluate(
      () => window.__INITIAL_STATE__?.explore?.events?.listings ?? []
    )
    await page.close()

    const results = []
    const seen = new Set()
    for (const listing of listings) {
      for (const card of listing.cards ?? []) {
        const item = mapCard(card, city)
        if (item && !seen.has(item.event.external_id)) {
          seen.add(item.event.external_id)
          results.push(item)
        }
      }
    }

    return results
  } finally {
    await browser.close()
  }
}
