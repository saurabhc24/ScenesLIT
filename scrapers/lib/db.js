import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const CANONICAL_CATEGORIES = [
  { name: 'Music',           icon: '🎵', keywords: ['music', 'concert', 'live music', 'band', 'dj', 'jazz', 'pop', 'rock', 'classical', 'bollywood', 'gig'] },
  { name: 'Comedy',          icon: '😂', keywords: ['comedy', 'stand-up', 'standup', 'improv', 'humour', 'humor', 'comic'] },
  { name: 'Theatre',         icon: '🎭', keywords: ['theatre', 'theater', 'drama', 'play', 'musical', 'opera', 'dance performance', 'ballet'] },
  { name: 'Nightlife',       icon: '🌙', keywords: ['nightlife', 'party', 'club', 'rave', 'edm', 'electronic', 'disco', 'karaoke'] },
  { name: 'Festivals',       icon: '🎪', keywords: ['festival', 'fair', 'carnival', 'mela', 'celebration', 'cultural', 'fete'] },
  { name: 'Art & Culture',   icon: '🎨', keywords: ['art', 'exhibition', 'gallery', 'culture', 'craft', 'design', 'photography', 'museum'] },
  { name: 'Food & Drink',    icon: '🍕', keywords: ['food', 'dining', 'restaurant', 'culinary', 'drinks', 'brunch', 'tasting', 'gastronomy', 'wine', 'beer', 'chef'] },
  { name: 'Sports & Fitness',icon: '⚽', keywords: ['sport', 'fitness', 'yoga', 'marathon', 'gym', 'match', 'tournament', 'race', 'cycling', 'cricket', 'football'] },
  { name: 'Workshops',       icon: '🔧', keywords: ['workshop', 'class', 'course', 'training', 'seminar', 'masterclass', 'bootcamp', 'session', 'learn'] },
  { name: 'Technology',      icon: '💻', keywords: ['tech', 'startup', 'hackathon', 'developer', 'coding', 'ai', 'software', 'innovation', 'product'] },
  { name: 'Cinema',          icon: '🎬', keywords: ['film', 'movie', 'cinema', 'screening', 'documentary'] },
  { name: 'Kids & Family',   icon: '🧒', keywords: ['kids', 'family', 'children', 'child', 'baby', 'toddler'] },
  { name: 'Dance',           icon: '💃', keywords: ['dance', 'salsa', 'bachata', 'hip-hop', 'hip hop', 'contemporary', 'zumba', 'kathak', 'bharatnatyam'] },
  { name: 'Wellness',        icon: '🧘', keywords: ['wellness', 'meditation', 'mindfulness', 'spa', 'healing', 'sound bath', 'breathwork'] },
]

function normalizeCategory(raw = '') {
  const lower = raw.toLowerCase()
  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return { name: cat.name, icon: cat.icon }
    }
  }
  return { name: 'Events', icon: '🎭' }
}

let _categories = null

async function loadCategories() {
  if (_categories) return _categories
  const { data, error } = await supabase.from('categories').select('*')
  if (error) throw error
  _categories = data
  return _categories
}

export async function ensureCategory(rawName) {
  const { name, icon } = normalizeCategory(rawName)
  const categories = await loadCategories()
  const existing = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, icon })
    .select('id')
    .single()
  if (error) throw error
  _categories = null // invalidate cache
  return data.id
}

export async function upsertVenue({ name, address, city, latitude, longitude }) {
  // Find existing venue by name + city
  const { data: existing } = await supabase
    .from('venues')
    .select('id')
    .eq('name', name)
    .eq('city', city)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('venues')
    .insert({ name, address, city, latitude, longitude })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function cleanupPastEvents() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0) // midnight UTC — keeps anything starting today
  const { count, error } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .lt('start_time', today.toISOString())
  if (error) throw error
  return count ?? 0
}

export async function deduplicateEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, source_platform, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error

  const groups = {}
  for (const e of events) {
    const key = `${e.title}||${e.source_platform}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }

  const idsToDelete = []
  for (const group of Object.values(groups)) {
    if (group.length > 1) {
      idsToDelete.push(...group.slice(1).map(d => d.id))
    }
  }

  if (idsToDelete.length === 0) return 0

  for (let i = 0; i < idsToDelete.length; i += 100) {
    const batch = idsToDelete.slice(i, i + 100)
    const { error: delErr } = await supabase.from('events').delete().in('id', batch)
    if (delErr) throw delErr
  }

  return idsToDelete.length
}

export async function upsertEvent(event) {
  // Check by external_id + source_platform
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('external_id', event.external_id)
    .eq('source_platform', event.source_platform)
    .maybeSingle()

  if (existing) {
    // Update in case details changed (date, price, etc.)
    const { error } = await supabase
      .from('events')
      .update(event)
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, isNew: false }
  }

  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, isNew: true }
}
