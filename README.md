# ScenesLIT

**Discover what's lit near you** — a map-first event discovery app for India.

ScenesLIT aggregates live events from District by Zomato, BookMyShow, Luma, and Urbanaut and plots them on an interactive map so you can see what's happening around you at a glance.

---

## Screenshots

<p align="center">
  <img src="portfolio assets/ScenesLIT_Phone_Mockup_1.png" alt="ScenesLIT Mobile View" width="360" />
</p>

<p align="center">
  <img src="portfolio assets/ScenesLIT - Dark Mode Twitter Post.png" alt="ScenesLIT Dark Mode" width="720" />
</p>

---

## Features

- **Map-first** — events plotted on an interactive Leaflet map with cluster markers
- **Sidebar event cards** — per-vendor styled cards (District, BookMyShow, Luma, Urbanaut)
- **Event detail popup** — venue mini-map, date/time, starting price, and a direct link to buy tickets
- **Real-time search** — debounced search across event titles and platforms
- **Location-aware** — detects your city and fetches nearby events within 50 km
- **Dark mode** — persisted to `localStorage`, toggleable from the navbar
- **Responsive** — dedicated layouts for desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Maps | Leaflet, react-leaflet, react-leaflet-cluster |
| Animations | Framer Motion |
| Backend / DB | Supabase (PostgreSQL) |
| Analytics | Vercel Analytics |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project with `events` and `venues` tables

### Install & Run

```bash
git clone https://github.com/saurabhc24/ScenesLIT.git
cd ScenesLIT
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STADIA_API_KEY=your_stadia_api_key_here   # optional — used for dark mode map tiles
```

---

## Data Sources

Events are scraped and synced into Supabase from:

- [District by Zomato](https://district.in)
- [BookMyShow](https://in.bookmyshow.com)
- [Luma](https://lu.ma)
- [Urbanaut](https://urbanaut.com)

---

## Live

[sceneslit.fun](https://sceneslit.fun)

---

*A passion project by [Saurabh](https://saurabhchandra.framer.website/)*
