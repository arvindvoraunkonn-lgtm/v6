'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

// ===========================================================================
// BEE — random word generator.
//
// Fetches an infinite stream of random words from a public API. The user
// can scroll through as many words as they want inside the container
// module. Clicking any word fetches and shows its dictionary meaning
// via the free dictionaryapi.dev.
//
// Sits next to DAISY in the top nav.
// ===========================================================================

const WORDS_BATCH_SIZE = 20;
// Auto-stream cadence (ms). Every interval tick fetches another batch
// of words and appends to the list, so the user sees a steady stream of
// fresh random words without any interaction. Tuned to be lively but
// not distracting.
const AUTO_STREAM_INTERVAL_MS = 4000;
// Soft cap to keep the DOM manageable — once the list reaches this
// many word-buttons, auto-streaming pauses until the user clicks Clear
// or Random. 1000 is well past any realistic browse session but stops
// unbounded memory growth.
const MAX_WORDS = 1000;
// Primary random-words API (Heroku-hosted, CORS-enabled, returns JSON array
// of random English words). The previous Vercel-hosted API
// (random-word-api.vercel.app) was deactivated by its owner (HTTP 402
// DEPLOYMENT_DISABLED), so we use the Heroku deployment which is still up
// and exposes `access-control-allow-origin: *`.
// Note: the parameter name is `number`, not `words`.
const RANDOM_WORD_API = 'https://random-word-api.herokuapp.com/word';
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Embedded fallback word list — used only if the random-words API is
// unreachable (e.g., Heroku dyno asleep, network blocked). This guarantees
// the user never sees a "Failed to fetch" error: they always get words to
// browse. We pick a random subset from this list when the API fails.
const FALLBACK_WORDS: string[] = [
  'apple', 'bridge', 'candle', 'dance', 'echo', 'flame', 'garden', 'horizon',
  'ivory', 'jasmine', 'kindle', 'lantern', 'meadow', 'nimbus', 'orchid',
  'pebble', 'quartz', 'ripple', 'silver', 'thunder', 'umbra', 'velvet',
  'whisper', 'xylem', 'yonder', 'zephyr', 'amber', 'breeze', 'cipher',
  'dawn', 'ember', 'forest', 'gleam', 'harbor', 'inlet', 'jungle', 'kettle',
  'lagoon', 'marble', 'nectar', 'oasis', 'prism', 'quiver', 'ravine',
  'summit', 'tundra', 'undying', 'vortex', 'willow', 'yarrow', 'zenith',
  'aurora', 'blossom', 'cascade', 'destiny', 'enigma', 'fable', 'glimmer',
  'haven', 'illusion', 'journey', 'kindred', 'legacy', 'mystic', 'nova',
  'oracle', 'phantom', 'quest', 'radiant', 'serene', 'tranquil', 'utopia',
  'verve', 'wander', 'yearn', 'zealot', 'azure', 'brook', 'crimson',
  'dewdrop', 'frozen', 'gilded', 'halcyon', 'opal', 'pearl', 'quaint',
  'rustic', 'sapphire', 'twilight', 'vivid', 'wondrous', 'yew', 'zest',
];

interface DictMeaning {
  partOfSpeech?: string;
  definition: string;
  example?: string;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: DictMeaning[];
}

export function BeeView() {
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Definition panel state — visible when the user clicks a word.
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const [defEntry, setDefEntry] = useState<DictEntry | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  // Used to prevent duplicate concurrent fetches during infinite scroll.
  const fetchingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Fetch a fresh batch of random words from the API and append to the list.
  // ---------------------------------------------------------------------------
  const fetchWords = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // AbortController so a sleeping Heroku dyno doesn't make the user wait
      // the browser's full ~30s default — we fall back to the embedded list
      // after 12s.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(
          `${RANDOM_WORD_API}?number=${WORDS_BATCH_SIZE}`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('Unexpected response shape');
        }
        const cleaned = data
          .map((w) => (typeof w === 'string' ? w : String(w ?? '')).trim())
          .filter(Boolean);
        if (cleaned.length > 0) {
          // Respect paused — if the user clicked Clear while this fetch
          // was in flight, don't dump the batch into the empty list.
          if (!pausedRef.current) {
            setWords((prev) => [...prev, ...cleaned]);
          }
          return;
        }
        // Empty payload — fall through to fallback.
        throw new Error('Empty word list');
      } finally {
        clearTimeout(timeout);
      }
    } catch (e) {
      // Any failure (network, HTTP error, timeout, parse) — silently fall
      // back to the embedded word list so the user always has words to
      // browse. We deliberately do NOT surface any error in the UI; the
      // user simply sees a fresh batch of words (from the fallback pool)
      // and can keep browsing seamlessly. The auto-stream interval and the
      // Random button both retry the live API on the next batch.
      // Respect paused — same guard as the success path so a Clear
      // mid-fetch doesn't dump fallback words into the empty list.
      if (!pausedRef.current) {
        const shuffled = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
        const slice = shuffled.slice(0, WORDS_BATCH_SIZE);
        setWords((prev) => [...prev, ...slice]);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial load on mount.
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // ---------------------------------------------------------------------------
  // Paused flag — set to TRUE by Clear so the auto-stream interval and
  // infinite-scroll handler stop fetching until the user clicks Random,
  // which resets it to FALSE. Also checked inside fetchWords' setWords
  // callbacks so an in-flight fetch that completes AFTER Clear was clicked
  // doesn't dump its batch into the (now empty) list.
  // ---------------------------------------------------------------------------
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ---------------------------------------------------------------------------
  // Auto-stream — continuously fetch new batches on a timer so the list
  // "keeps streaming" without any user interaction. Pauses when a fetch
  // is already in progress, the soft cap (MAX_WORDS) is reached, OR the
  // user has clicked Clear (paused=true). The interval is set up once on
  // mount and cleared on unmount, so it only runs while the Bee view is
  // actually visible.
  // ---------------------------------------------------------------------------
  const wordsCountRef = useRef(0);
  useEffect(() => {
    wordsCountRef.current = words.length;
  }, [words.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!pausedRef.current && !fetchingRef.current && wordsCountRef.current < MAX_WORDS) {
        fetchWords();
      }
    }, AUTO_STREAM_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchWords]);

  // ---------------------------------------------------------------------------
  // Clear — empty the list entirely AND pause auto-streaming. No more
  // words will load (neither from the interval nor from infinite scroll)
  // until the user clicks Random.
  // ---------------------------------------------------------------------------
  const handleClear = useCallback(() => {
    setPaused(true);
    setWords([]);
    setSelectedWord(null);
    setDefEntry(null);
    setDefError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Random — resume streaming (clear the paused flag), reset the list,
  // and immediately fetch a fresh batch from the live API (or fallback).
  // The auto-stream interval continues afterwards as normal.
  // ---------------------------------------------------------------------------
  const handleRandom = useCallback(() => {
    setPaused(false);
    setWords([]);
    setSelectedWord(null);
    setDefEntry(null);
    setDefError(null);
    // Kick off an immediate fetch — if one is already in flight, the
    // next auto-stream tick will resume.
    if (!fetchingRef.current) {
      fetchWords();
    }
  }, [fetchWords]);

  // ---------------------------------------------------------------------------
  // Fetch the dictionary meaning for the clicked word.
  // ---------------------------------------------------------------------------
  const handleWordClick = useCallback(async (word: string) => {
    setSelectedWord(word);
    setDefEntry(null);
    setDefError(null);
    setDefLoading(true);
    try {
      const res = await fetch(
        `${DICTIONARY_API}/${encodeURIComponent(word)}`,
        { cache: 'no-store' }
      );
      if (res.status === 404) {
        setDefError('No definition found for this word.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setDefError('No definition available.');
        return;
      }
      const first = data[0];
      const meanings: DictMeaning[] = Array.isArray(first.meanings)
        ? first.meanings.map((m: { partOfSpeech?: string; definitions?: Array<{ definition: string; example?: string }> }) => ({
            partOfSpeech: m.partOfSpeech,
            definition: m.definitions?.[0]?.definition ?? '',
            example: m.definitions?.[0]?.example,
          })).filter((m: DictMeaning) => m.definition)
        : [];
      setDefEntry({
        word: first.word ?? word,
        phonetic: Array.isArray(first.phonetics)
          ? first.phonetics.find((p: { text?: string }) => p.text)?.text
          : first.phonetic,
        meanings,
      });
    } catch (e) {
      setDefError(e instanceof Error ? e.message : 'Failed to fetch definition');
    } finally {
      setDefLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Infinite scroll: when the user nears the bottom of the container,
  // fetch the next batch automatically. The threshold is generous
  // (200px) so the stream keeps going even before the user reaches the
  // absolute bottom — paired with the auto-stream interval this gives
  // a continuous streaming feel.
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      // Respect the paused flag — after Clear, scroll-triggered fetches
      // are suppressed until the user clicks Random.
      if (distanceFromBottom < 200 && !loading && !pausedRef.current) {
        fetchWords();
      }
    },
    [loading, fetchWords]
  );

  const closeDefinition = useCallback(() => {
    setSelectedWord(null);
    setDefEntry(null);
    setDefError(null);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto p-3 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)] mb-3">
        <span className="font-semibold text-[var(--text)]">Bee</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 text-[11px] rounded-[3px] border cursor-pointer whitespace-nowrap"
            style={{
              borderColor: 'var(--border-light)',
              color: 'var(--text-muted)',
              background: 'var(--bg)',
            }}
            title="Empty the list"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleRandom}
            className="px-2 py-1 text-[11px] rounded-[3px] border cursor-pointer whitespace-nowrap"
            style={{
              borderColor: 'var(--border-light)',
              color: 'var(--text-muted)',
              background: 'var(--bg)',
            }}
            title="Reset and start a fresh stream"
          >
            Random
          </button>
        </div>
      </div>

      {/* Container module — scrollable, infinite browsing of random words */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="border border-[var(--border-light)] rounded-[3px] overflow-y-auto"
        style={{
          height: '55vh',
          background: 'var(--bg)',
        }}
      >
        <ul className="flex flex-wrap gap-1.5 p-2">
          {words.map((w, i) => {
            const isSelected = selectedWord === w;
            return (
              <li key={`${w}-${i}`}>
                <button
                  type="button"
                  onClick={() => handleWordClick(w)}
                  className="px-2 py-1 text-[11px] rounded-[3px] border cursor-pointer transition-none"
                  style={
                    isSelected
                      ? {
                          borderColor: 'var(--accent)',
                          background: 'var(--accent)',
                          color: 'var(--accent-text)',
                        }
                      : {
                          borderColor: 'var(--border-light)',
                          background: 'var(--bg)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  {w}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Definition panel — shown when the user clicks a word */}
      {selectedWord && (
        <div
          className="mt-3 border rounded-[3px] p-2.5 space-y-2"
          style={{ borderColor: 'var(--border-light)', background: 'var(--bg)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-[13px]" style={{ color: 'var(--text)' }}>
                {selectedWord}
              </div>
              {defEntry?.phonetic && (
                <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  {defEntry.phonetic}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={closeDefinition}
              className="shrink-0 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close definition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {defLoading && (
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Looking up meaning…</span>
            </div>
          )}

          {defError && !defLoading && (
            <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {defError}
            </div>
          )}

          {defEntry && !defLoading && defEntry.meanings.length > 0 && (
            <ol className="space-y-1.5 list-decimal pl-4">
              {defEntry.meanings.map((m, i) => (
                <li key={i} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {m.partOfSpeech && (
                    <span className="italic" style={{ color: 'var(--text-faint)' }}>
                      {m.partOfSpeech}{' '}
                    </span>
                  )}
                  <span>{m.definition}</span>
                  {m.example && (
                    <div className="mt-0.5 text-[10px] italic" style={{ color: 'var(--text-faint)' }}>
                      &ldquo;{m.example}&rdquo;
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
