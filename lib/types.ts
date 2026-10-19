export type SocialPlatform =
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'spotify'
  | 'apple music'
  | 'mastodon'
  | 'bluesky'
  | 'youtube'
  | 'tiktok'
  | 'soundcloud'
  | 'bandcamp'
  | 'threads'
  | 'custom';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  customTitle?: string;
  url: string;
  username: string;
  bioUsed?: string;
  postCount?: number | string;
  otherMediaCount?: number | string;
  notes?: string;
}

export interface InspirationItem {
  id: string;
  artistName: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  actualName: string;
  biography: string;
  socialDob: string; // YYYY-MM-DD or text
  socials: SocialLink[];
  label: string;
  genre: string;
  subGenre: string;
  style: string;
  averageBpm: number | string;
  inspirations: InspirationItem[];
  category: 'independent' | 'dependent';
  distributor: string;
  wikipediaUrl?: string;
  // Responsive profile picture (square) and banner (wide) — CDN URL or local file in IndexedDB
  profileImageUrl?: string;
  profileImageFileId?: string;
  bannerImageUrl?: string;
  bannerImageFileId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReleaseType = 'single' | 'album' | 'ep' | 'mixtape' | string;

export interface CreditItem {
  id: string;
  role: string; // lyricist, composer, additional composer, mixer, producer, custom
  name: string;
  profileUrls: string[];
  email?: string;
  // Internal vs. external credit. When set, this credit refers to one of
  // the user's OWN personas (artist.id in AppDataStore.artists). The credit's
  // `name` field can still be any alias (e.g. "Lil X") — exports & press
  // kits show only the name as-typed, but the management UI surfaces an
  // "internal: <persona name>" marker so the user can keep the cross-
  // reference straight in their head.
  linkedArtistId?: string;
}

// ===========================================================================
// INSPIRATION INBOX — unassigned ideas that can be triaged later and
// assigned to a specific persona. A single global queue (not per-artist)
// so the user can capture an idea fast without context-switching.
// ===========================================================================

export type InboxItemKind =
  | 'lyric'      // a lyric snippet, hook, verse line, etc.
  | 'beat'       // a beat URL (YouTube, BeatStars, drive, etc.)
  | 'artwork'    // an artwork reference URL or description
  | 'title'      // a song/album title idea
  | 'thought'    // a free-form concept / direction
  | 'link';      // any other URL (article, reference, sample pack, etc.)

export interface InboxItem {
  id: string;
  kind: InboxItemKind;
  // The main payload. For lyric/thought/title this is plain text; for
  // beat/artwork/link this is a URL.
  content: string;
  // Optional context the user attached at capture time.
  note?: string;
  // When set, this idea has been assigned to a specific persona
  // (artist.id). Unassigned ideas stay in the inbox queue.
  linkedArtistId?: string;
  createdAt: string;
  // ---- Optional fields added for the redesigned Inbox. All default
  // to undefined/empty for legacy items so existing data keeps working. ----
  // Long markdown body for ideas that need a full editor (especially
  // 'thought' and 'lyric' kinds). When present, takes precedence over
  // 'content' for display in the detail view.
  body?: string;
  // Free-form tags for organisation/filtering.
  tags?: string[];
  // Triage priority. Default (unset) is treated as 'medium'.
  priority?: 'low' | 'medium' | 'high';
  // Timestamp of the last edit. Falls back to createdAt for legacy items.
  updatedAt?: string;
}

export interface TrackItem {
  id: string;
  trackNumber: number;
  title: string;
  artworkUrl?: string;
  artworkFileId?: string;
  audioFileId?: string;
  audioFileName?: string;
  audioUrl?: string;
  duration?: string;
  genre?: string;
  subGenre?: string;
  credits?: CreditItem[];
  beatType?: 'type beat' | 'custom produced' | 'cdn url' | 'bandlab' | 'none' | string;
  beatUrl?: string;
  // Per-track split sheet — who gets what % of royalties for THIS track.
  // Optional; if absent, the release-level credits apply.
  splits?: SplitEntry[];
}

// ===========================================================================
// SPLIT SHEET — per-track royalty splits. Each entry is a single
// collaborator's stake in a track. Percentages should sum to 100 per
// track but the app doesn't enforce that (sometimes splits are
// approximate, sometimes there's a remainder for the label).
// ===========================================================================

export interface SplitEntry {
  id: string;
  name: string;
  role: string;            // producer, writer, performer, mixer, publisher, etc.
  percentage: number;      // 0-100
  notes?: string;
}

export interface Release {
  id: string;
  artistId: string;
  title: string;
  type: ReleaseType;
  isReleased: boolean; // released or unreleased
  releaseDate?: string;
  year?: string;
  genre: string;
  subGenre: string;
  artworkUrl?: string;
  artworkFileId?: string;
  // single specific
  hasFeatures?: boolean;
  featureNames?: string[];
  beatType?: 'type beat' | 'custom produced' | 'cdn url' | 'bandlab' | 'none' | string;
  beatUrl?: string;
  credits: CreditItem[];
  musicVideoDone?: boolean;
  musicVideoUploaded?: boolean;
  musicVideoKind?: 'visualiser' | 'music video' | 'video with artwork' | 'official release' | string;
  musicVideoUrl?: string;
  // album / ep / mixtape specific
  tracks: TrackItem[];
  trackCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementAttachment {
  id: string;
  // Local file stored in IndexedDB (image or any file type)
  fileId?: string;
  fileName?: string;
  fileType?: string; // MIME type, e.g. 'image/png', 'application/pdf'
  // OR an external URL (Google Drive link, Dropbox, etc.)
  url?: string;
  title?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  artistId: string;
  date: string; // YYYY-MM-DD or formatted
  title: string;
  note: string;
  // Optional attachments (local file or external URL)
  attachments?: AchievementAttachment[];
  // Optional link to a release that contributed to this achievement
  linkedReleaseId?: string;
  // Optional link to a specific track within that release
  linkedTrackId?: string;
  // Optional links to notes (note ids — notes can be shared across artists)
  linkedNoteIds?: string[];
  createdAt: string;
}

export interface ArtworkEntry {
  id: string;
  artistId?: string;
  title: string;
  imageUrl?: string;
  imageFileId?: string;
  sourceReleaseId?: string;
  sourceTrackId?: string;
  sourceType?: 'release' | 'track' | 'standalone';
  createdAt: string;
}

export interface LyricsDocument {
  id: string;
  artistId: string;
  fileName: string;
  lyrics: string;
  releaseId?: string;
  trackId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDocument {
  id: string;
  artistId?: string; // empty means shared
  title: string;
  body: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeaturePerson {
  id: string;
  name: string;
  role: string; // artist, producer, music video director, mixer, etc.
  email?: string;
  socialLinks: string[];
  projectsWorkedOn: string[];
  notes?: string;
  // Internal vs. external. When set, this featured person is actually one
  // of the user's OWN personas (artist.id in AppDataStore.artists). The
  // displayed `name` can be any alias. Exports / press kits show only the
  // name as-typed; the management UI shows an "internal" marker.
  linkedArtistId?: string;
  createdAt: string;
}

export interface TypeBeatSample {
  id: string;
  title: string;
  url: string;
  artworkUrl?: string;
  artworkFileId?: string;
  colorTag?: string; // e.g. #ff3366 - the only place with color!
  lyricsStatus: 'available' | 'not available';
  lyricsText?: string;
  forArtist?: string; // pseudonymous artist
  createdAt: string;
}

export interface ArtworkIdea {
  id: string;
  title: string;
  url: string;
  notes?: string;
  createdAt: string;
}

export interface MusicVideoIdea {
  id: string;
  title: string;
  concept: string;
  referenceUrl?: string;
  createdAt: string;
}

export interface CustomMiscEntry {
  id: string;
  title: string;
  url: string;
  notes?: string;
  createdAt: string;
}

export interface MoodboardItem {
  id: string;
  folderId: string;
  title: string;
  type: 'youtube' | 'video' | 'image' | 'audio' | 'link' | 'note';
  url: string;
  notes?: string;
  createdAt: string;
}

export interface MoodboardFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  type: 'artist' | 'meta';
  artistId?: string;
  artistName?: string;
  itemCounts: {
    artists?: number;
    releases?: number;
    achievements?: number;
    artworks?: number;
    lyrics?: number;
    notes?: number;
    features?: number;
    misc?: number;
  };
  notes?: string;
}

export interface MetaBackupData {
  version: number;
  exportedAt: string;
  logs: BackupLog[];
  artistSnapshots: {
    artistId: string;
    artistName: string;
    lastBackedUpAt: string;
    releaseCount: number;
    achievementsCount: number;
    lyricsCount: number;
    notesCount: number;
  }[];
}

// JASmine — saved lyrics search results from lrclib.net
// Stored in folders (with optional nested sub-folders) so the user can
// organize inspiration by mood / genre / artist etc.

export interface JasmineFolder {
  id: string;
  name: string;
  // Optional parent folder id — when undefined, this is a top-level folder.
  // Lets the user create nested sub-folders arbitrarily deep.
  parentId?: string;
  createdAt: string;
}

export interface JasmineEntry {
  id: string;
  folderId?: string; // undefined = stored at the root level
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number; // seconds
  // Plain lyrics (no timestamps) — always present if returned by lrclib
  plainLyrics?: string;
  // Time-synced lyrics in LRC format ([00:12.34] line text ...)
  syncedLyrics?: string;
  // Whether the user picked the synced version as the "primary" lyrics to show
  preferSynced?: boolean;
  // Artwork URL from iTunes (high-res, 600x600). Saved so viewing is instant
  // (no re-fetch needed) and works offline after first save.
  artworkUrl?: string;
  // Genre from iTunes (helps identify the original track in search)
  genre?: string;
  // Release date from iTunes (ISO string) — helps identify the original
  releaseDate?: string;
  // Free-form note the user can attach (e.g. "use this hook for the bridge")
  note?: string;
  createdAt: string;
}

// ===========================================================================
// DAISY — song-title generation + lyrics/artwork lookup tool.
// The user generates random song titles (infinite, never repeating within
// a session), can look up artwork + lyrics per title on demand, and can
// save titles in bulk.
// ===========================================================================

export interface DaisyEntry {
  id: string;
  // The generated title (always present)
  title: string;
  // Optional: artist the user matched this title to (via lrclib search)
  artistName?: string;
  // Optional: album name from iTunes
  albumName?: string;
  // Optional: duration in seconds (from lrclib/iTunes)
  duration?: number;
  // Optional: artwork URL from iTunes (600x600)
  artworkUrl?: string;
  // Optional: lyrics (plain, no timestamps)
  plainLyrics?: string;
  // Optional: synced lyrics (LRC format)
  syncedLyrics?: string;
  // Whether the user prefers the synced view when both are available
  preferSynced?: boolean;
  // Optional: genre from iTunes
  genre?: string;
  // Optional: note the user attaches (e.g. "good hook idea")
  note?: string;
  createdAt: string;
}

// ===========================================================================
// PRESS — press coverage log. Articles, interviews, reviews, podcast
// appearances, TV spots, playlist placements, per persona.
// ===========================================================================

export type PressKind =
  | 'interview'
  | 'review'
  | 'feature'
  | 'podcast'
  | 'tv appearance'
  | 'playlist placement'
  | 'other';

export interface PressCoverage {
  id: string;
  personaId?: string;       // which of your personas is mentioned
  outlet: string;           // e.g., "Pitchfork", "Complex", "XXL"
  title: string;            // article / segment title
  url: string;              // article URL
  kind: PressKind;
  date: string;             // YYYY-MM-DD the coverage was published
  notes?: string;
  createdAt: string;
}

// ===========================================================================
// MERCH — per-persona merch catalog. Each item is a product (apparel,
// vinyl, digital, accessory, etc.) with status and drop date.
// ===========================================================================

export type MerchStatus =
  | 'idea'
  | 'designed'
  | 'produced'
  | 'in-stock'
  | 'sold-out'
  | 'archived';

export interface MerchItem {
  id: string;
  personaId?: string;       // which persona this belongs to (optional for shared items)
  name: string;             // e.g., "Cactus Jack Hoodie"
  category: string;         // apparel, vinyl, digital, accessory, bundle, etc.
  price?: string;           // currency string e.g., "$45"
  status: MerchStatus;
  dropDate?: string;        // YYYY-MM-DD when launched
  url?: string;             // store link if live
  notes?: string;
  createdAt: string;
}

// ===========================================================================
// REEL — music video / visual project tracker. Per persona, optionally
// linked to a release. Tracks the full lifecycle from idea to public.
// ===========================================================================

export type VideoKind =
  | 'music video'
  | 'visualiser'
  | 'lyric video'
  | 'behind the scenes'
  | 'live performance'
  | 'other';

export type VideoStatus =
  | 'idea'
  | 'planned'
  | 'shot'
  | 'edited'
  | 'uploaded'
  | 'public';

export interface VideoProject {
  id: string;
  personaId?: string;
  releaseId?: string;       // link to a release if applicable
  title: string;
  kind: VideoKind;
  director?: string;
  status: VideoStatus;
  budget?: string;         // currency string, e.g., "$5,000"
  shootDate?: string;       // YYYY-MM-DD
  releaseDate?: string;     // YYYY-MM-DD when published
  url?: string;             // YouTube / Vimeo link
  notes?: string;
  createdAt: string;
}

// ===========================================================================
// DEALS — sample / interpolation / type-beat / feature-deal / collab-deal
// tracker. Captures anything that involves a third-party clearance,
// purchase, or contract — including "I plan to purchase this later"
// (when will I purchase if not today).
// ===========================================================================

export type DealKind =
  | 'sample'
  | 'interpolation'
  | 'type beat'
  | 'beat lease'
  | 'feature deal'
  | 'collab deal'
  | 'sync placement'
  | 'other';

export type DealStatus =
  | 'idea'           // not yet pursued
  | 'inquiry'        // initial contact made
  | 'negotiating'    // terms under discussion
  | 'pending'        // agreed but paperwork/payment pending
  | 'purchased'      // bought & paid
  | 'cleared'        // legally cleared (for samples/interpolations)
  | 'denied'         // rejected
  | 'expired';       // deal fell through / option expired

export interface SampleClearance {
  id: string;
  personaId?: string;        // which persona this deal relates to
  type: DealKind;
  title: string;             // what was used / purchased / negotiated
  source?: string;           // original source (URL or description) for samples
  counterparty?: string;     // who you're dealing with (producer, label, owner, etc.)
  status: DealStatus;
  cost?: string;             // currency string
  purchaseDate?: string;     // when you actually purchased (or null if not yet)
  plannedPurchaseDate?: string; // when you plan to purchase (the "when will I purchase if not today" field)
  notes?: string;
  createdAt: string;
}
