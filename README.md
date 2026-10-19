# Pseudonymous

A mobile-first e-ink document app for managing music artists, releases, lyrics, notes, artworks, achievements, and assets.

## Artist persona management

- Multiple artist personas with profile, banner, biography, socials, inspirations, Wikipedia URL
- Per-persona social links with automatic username extraction for Instagram, X, Facebook, Bluesky, Mastodon, Spotify, Apple Music, YouTube, TikTok, SoundCloud, Bandcamp, Threads, and custom platforms
- Profile picture + banner with image-editing-style crop (draggable + resizable rectangle with corner handles and rule-of-thirds grid)
- Crop works for both local file uploads AND CDN URLs (cross-origin-safe canvas)
- Custom label creation that never falls/fails (live-commit on type, blur, and outside-click)
- Internal vs. external credits — link a credit to one of your own personas; visible in management UI, hidden in exports and the press-kit modal
- Wikipedia-style profile view: page-title H1, italic alias, auto-generated lead paragraph, metadata infobox, sectioned body (Biography, Social media & links, Inspiration & styled from), last-updated footer
- Title-cased genre and sub-genre labels everywhere ("Indie Rock" not "indie rock"), with special-case acronyms (R&B, UK, K-Pop, IDM)

## Releases

- Singles, albums, EPs, mixtapes
- Per-track audio file storage in IndexedDB (up to 1GB)
- Per-track artwork
- Per-track split sheet — name, role, percentage, notes, with a live total that turns solid when the sum hits 100%
- Beat type tracking: type beat / custom produced / CDN URL / BandLab / none
- Beat URL reference
- Music video metadata: kind, done, uploaded, URL
- Feature names for singles
- Release-level credits with role, name, profile URLs, email, and internal-persona link
- Multiple view modes: list, grid, normal (persistent per filter)
- Release detail modal — clickable from any view — acts as the press-kit / export-style readout (no internal markers shown)

## Unreleased

- Separate filter for unreleased music, same management UI as released music

## Achievements

- Timeline view
- File attachments (local, IndexedDB-stored) and external URL attachments
- Linked releases, tracks, and notes
- Per-achievement notes

## Artworks

- Auto-aggregated from releases
- Standalone artwork entries
- Grid + list views (persistent)

## Lyrics

- Markdown editor with structure-tag slash menu
- Floating, movable structure panel
- Edit / split / preview modes

## Notes

- Markdown editor with live preview
- Auto-save
- Edit / split / preview modes
- Shared (no artist) or per-persona

## Discography

- Chronological release overview across a persona

## Features (collaborator directory + contact book)

- Reusable across all personas
- 24 role tags: Artist, Producer, Music video director, Audio engineer, Mixing engineer, Mastering engineer, Songwriter, Composer, Topliner, Creative director, Photographer, Stylist, Graphic designer, DP / cinematographer, Editor, Colorist, Publicist, A&R, Manager, Booking agent, Lawyer, Accountant, Distributor rep
- Custom roles supported
- Internal flag — link a featured person to one of your own personas; hidden in exports

## Inspiration inbox

- Global queue of unassigned ideas (not per-persona)
- 6 idea kinds: lyric, beat, artwork, title, thought, link
- Assign-to-persona dropdown with quick-jump link
- Filter: all / unassigned / per-persona
- Stays open after capture for rapid batch entry

## Miscellaneous

- Type beats — shared beat library with color tags and lyrics status
- Ideas — artwork, music video, custom entries
- Mood board — folders with embedded YouTube, video, image, audio, link, and note items
- Press coverage log — articles, interviews, reviews, podcasts, TV, playlist placements per persona
- Per-persona merch catalog — apparel, vinyl, digital, accessory, bundle, with status lifecycle (idea → designed → produced → in-stock → sold-out → archived) and drop date
- Music video tracker — full lifecycle (idea → planned → shot → edited → uploaded → public), director, budget, shoot date, release date, linkable to a release
- Deals tracker — samples, interpolations, type beats, beat leases, feature deals, collab deals, sync placements
  - Planned purchase date tracking with auto-surfacing of overdue and upcoming items
  - Counterparty, source, cost, purchase date, and notes per deal
- Each Misc sub-feature is individually toggleable in Settings

## JASmine (lyrics search)

- Search via lrclib.net API
- iTunes artwork matching (high-res 600x600)
- Synced and plain lyrics with toggle
- Nested folder system for saved lyrics
- Four view modes: grid, normal, list, database (persistent)
- Movable lyrics window

## DAISY (song title generator)

- Random real song discovery via iTunes API
- Artist discography search (by artist, album/EP, or song)
- Album track listing via iTunes lookup API
- Apple Music verified artist badges
- Three view modes: normal, list, grid (persistent)
- Movable lyrics window with on-demand lrclib lookup
- Bulk save titles

## Universal search

- Cross-persona search across artists, releases, tracks, achievements, notes, lyrics, and features

## Image crop modal

- Image-editing-style crop (draggable + resizable rectangle, no slider)
- Rule-of-thirds grid lines inside the crop box
- 4 corner resize handles
- Works for both File inputs and remote CDN URLs (uses crossOrigin='anonymous' so the canvas isn't tainted)
- High-res JPEG output, capped at 1200px wide
- Direct DOM writes during drag for zero-lag pointer interaction

## Theming

- Dark mode toggle
- CSS variable theming throughout
- Custom background and text colors per theme

## Storage and backup

- IndexedDB for files (images, audio up to 1GB)
- localStorage + IndexedDB for app data persistence (with legacy-data migration)
- Export / Import zip (full meta-backup + isolated artist backup)
- TXT, CSV, and Markdown export formats
- All operational data (inbox, press, merch, video projects, deals, per-track splits, internal credit links) automatically included in every backup

## Settings

- Toggle JASmine on/off
- Toggle DAISY on/off
- Toggle Press / Merch / Music Video / Deals sub-features on/off
- Dark mode
- Custom theme colors

## Other

- View mode persistence (releases, artworks, home artists, JASmine entries, DAISY discography)
- Typed confirmation modals for destructive actions
- Button confirmation modals for edits
- Audio player with seek, mute, and duration display
- Mobile-first responsive design
- Local-only data — no outbound network calls except explicit user actions (lrclib lookups, iTunes search, link clicks)
