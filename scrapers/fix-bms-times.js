/**
 * One-off fix: re-parse start_time for all BookMyShow events
 * from their stored image_url using the corrected datetime extraction.
 *
 * Run locally:  node --env-file=.env fix-bms-times.js
 * Run via CI:   trigger "fix-bms-times" job in GitHub Actions
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Decode all ie-{base64} text overlays from a BMS image URL
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

// Parse decoded text overlays into an IST-aware ISO datetime string
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
    if (d < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) {
      d = buildDate(year + 1)
    }
    return d ? d.toISOString() : null
  } catch { return null }
}

async function main() {
  console.log(`BMS time fix — ${new Date().toISOString()}\n`)

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_time, image_url')
    .eq('source_platform', 'bookmyshow')
    .not('image_url', 'is', null)

  if (error) { console.error('Fetch failed:', error.message); process.exit(1) }
  console.log(`Found ${events.length} BMS events\n`)

  let updated = 0
  let unchanged = 0
  let failed = 0

  for (const ev of events) {
    const texts = extractTextsFromImgUrl(ev.image_url)
    const newTime = parseDateTime(texts)

    if (!newTime || newTime === ev.start_time) { unchanged++; continue }

    const { error: updateErr } = await supabase
      .from('events')
      .update({ start_time: newTime })
      .eq('id', ev.id)

    if (updateErr) {
      console.error(`  FAIL "${ev.title}": ${updateErr.message}`)
      failed++
    } else {
      console.log(`  OK   "${ev.title}": ${ev.start_time ?? 'null'} -> ${newTime}`)
      updated++
    }
  }

  console.log(`\nDone — updated: ${updated}, unchanged: ${unchanged}, failed: ${failed}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
