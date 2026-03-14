/**
 * Daily maintenance — cleanup expired events + deduplicate
 * Runs without Playwright (no browser needed)
 */

import { cleanupPastEvents, deduplicateEvents } from './lib/db.js'

async function main() {
  console.log(`ScenesLIT maintenance — ${new Date().toISOString()}\n`)

  process.stdout.write('Cleaning up past events... ')
  const deleted = await cleanupPastEvents()
  console.log(`${deleted} deleted`)

  process.stdout.write('Deduplicating events... ')
  const dupes = await deduplicateEvents()
  console.log(`${dupes} duplicates removed`)

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
