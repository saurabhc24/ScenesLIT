/**
 * Luma scraper diagnostics — run with: node test-luma.js
 * Checks: city page loads, event URLs found, __NEXT_DATA__ structure on first event
 */

import { chromium } from 'playwright'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CITY = 'mumbai'

async function run() {
  const browser = await chromium.launch({ headless: false }) // visible so you can watch
  try {
    const context = await browser.newContext({ userAgent: UA })
    const page = await context.newPage()

    // ── Step 1: city page ──────────────────────────────────────────────────────
    const cityUrl = `https://lu.ma/${CITY}`
    console.log(`\n[1] Loading city page: ${cityUrl}`)
    const res = await page.goto(cityUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    console.log(`    Status: ${res.status()}  Final URL: ${page.url()}`)
    await page.waitForTimeout(3000)

    // Scroll
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)
    }

    // ── Step 2: collect ALL hrefs on the page ─────────────────────────────────
    const allHrefs = await page.$$eval('a[href]', els => [...new Set(els.map(el => el.href))])
    const lumaHrefs = allHrefs.filter(h => h.includes('luma.com') || h.includes('lu.ma'))
    console.log(`\n[2] Total hrefs: ${allHrefs.length}  lu.ma hrefs: ${lumaHrefs.length}`)
    console.log('    Sample lu.ma links:')
    lumaHrefs.slice(0, 20).forEach(h => console.log(`      ${h}`))

    // ── Step 3: apply the current event-URL filter ────────────────────────────
    const EXCLUDED = new Set(['discover', 'signin', 'login', 'signup', 'pricing', 'about', 'blog', 'create', 'ios', 'android', 'map', 'people', 'calendar', 'help', 'terms', 'privacy'])
    const eventUrls = lumaHrefs.filter(href => {
      try {
        const url = new URL(href)
        if (!['lu.ma', 'luma.com'].includes(url.hostname)) return false
        const seg = url.pathname.split('/').filter(Boolean)
        if (seg.length !== 1) return false
        if (EXCLUDED.has(seg[0])) return false
        // Luma event slugs are short alphanumeric (no hyphens in city/user pages)
        if (!/^[a-z0-9]{6,12}$/.test(seg[0])) return false
        return true
      } catch { return false }
    })
    console.log(`\n[3] Event URLs after filter: ${eventUrls.length}`)
    eventUrls.slice(0, 10).forEach(u => console.log(`      ${u}`))

    await page.close()

    // ── Step 4: check __NEXT_DATA__ on first event ────────────────────────────
    if (eventUrls.length === 0) {
      console.log('\n[4] No event URLs found — skipping __NEXT_DATA__ check')
      return
    }

    const eventUrl = eventUrls[0]
    console.log(`\n[4] Checking __NEXT_DATA__ on: ${eventUrl}`)
    const ePage = await context.newPage()
    await ePage.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await ePage.waitForTimeout(2000)

    const nextDataRaw = await ePage.$eval('#__NEXT_DATA__', el => el.textContent).catch(() => null)
    if (!nextDataRaw) {
      console.log('    __NEXT_DATA__ NOT FOUND on event page')
      const scripts = await ePage.$$eval('script[id]', els => els.map(el => el.id))
      console.log('    Script IDs on page:', scripts)
    } else {
      const nextData = JSON.parse(nextDataRaw)
      const pageProps = nextData?.props?.pageProps
      console.log('    __NEXT_DATA__ found! pageProps keys:', Object.keys(pageProps || {}))

      // Deep-inspect initialData
      const initialData = pageProps?.initialData
      const data = initialData?.data
      if (data) {
        const ev = data.event
        console.log('\n    === Event fields ===')
        console.log('    name:', ev?.name)
        console.log('    start_at (data):', data.start_at)
        console.log('    start_at (event):', ev?.start_at)
        console.log('    cover_url:', ev?.cover_url)
        console.log('    cover_image:', JSON.stringify(data.cover_image)?.slice(0, 100))
        console.log('    geo_latitude:', ev?.geo_latitude)
        console.log('    geo_longitude:', ev?.geo_longitude)
        console.log('    geo_address_info:', JSON.stringify(ev?.geo_address_info)?.slice(0, 200))
        console.log('    ticket_info:', JSON.stringify(data.ticket_info)?.slice(0, 200))
        console.log('    event.url:', ev?.url)
        console.log('    event.api_id:', ev?.api_id)
        console.log('    route:', data.route)
      }
    }

    await ePage.close()
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
