'use client';

import React from 'react';
import { Artist } from '../lib/types';
import { Search } from 'lucide-react';

export type ActivePage =
  | 'home'
  | 'add-artist'
  | 'profile'
  | 'release'
  | 'unreleased'
  | 'achievements'
  | 'artworks'
  | 'lyrics'
  | 'discography'
  | 'features'
  | 'notes'
  | 'miscellaneous'
  | 'export-import'
  | 'artists'
  | 'jasmine'
  | 'daisy'
  | 'bee'
  | 'settings';

interface TopNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  selectedArtist: Artist | null;
  onSelectArtist: (artist: Artist | null) => void;
  onOpenSearch: () => void;
  jasmineEnabled: boolean;
  daisyEnabled: boolean;
  beeEnabled: boolean;
}

export function TopNav({
  activePage,
  onNavigate,
  selectedArtist,
  onSelectArtist,
  onOpenSearch,
  jasmineEnabled,
  daisyEnabled,
  beeEnabled,
}: TopNavProps) {
  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'release', label: 'Release' },
    { id: 'unreleased', label: 'Unreleased' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'artworks', label: 'Artworks' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'discography', label: 'Discography' },
    { id: 'features', label: 'Features' },
    { id: 'notes', label: 'Notes' },
    { id: 'miscellaneous', label: 'Miscellaneous' },
    { id: 'export-import', label: 'Export/Import' },
    ...(jasmineEnabled ? [{ id: 'jasmine' as const, label: 'JASmine' }] : []),
    ...(daisyEnabled ? [{ id: 'daisy' as const, label: 'DAISY' }] : []),
    ...(beeEnabled ? [{ id: 'bee' as const, label: 'Bee' }] : []),
    { id: 'settings', label: 'Settings' },
  ];

  if (!selectedArtist) {
    return (
      <header className="border-b border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
        {/* Single horizontal row: search (flex-1) + Export/Import + Add artist.
            All three are aligned on one row, shrunk to fit, and stay responsive
            thanks to the flex-1 search input that absorbs width changes. */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-[3px] border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text-faint)] hover:border-[var(--border)] hover:text-[var(--text)] cursor-pointer whitespace-nowrap min-w-0"
            aria-label="Search"
            title="Universal search"
          >
            <Search className="w-3 h-3 shrink-0" />
            <span className="truncate">Search artists, releases, notes…</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('export-import')}
            className={`px-2 py-1 text-[11px] rounded-[3px] border cursor-pointer whitespace-nowrap shrink-0 ${
              activePage === 'export-import'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--border)]'
                : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border-light)] hover:border-[var(--border)]'
            }`}
          >
            Import/Export
          </button>
          <button
            type="button"
            onClick={() => onNavigate('add-artist')}
            className={`px-2 py-1 text-[11px] rounded-[3px] border cursor-pointer whitespace-nowrap shrink-0 ${
              activePage === 'add-artist'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--border)]'
                : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border-light)] hover:border-[var(--border)]'
            }`}
          >
            + Artist
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
      {/* Top row: Artist name & switch artist */}
      <div className="flex items-center justify-between text-xs mb-1.5 pb-1 border-b border-[var(--border-light)]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-[var(--text)] truncate">{selectedArtist.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-[3px] border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text-faint)] hover:border-[var(--border)] hover:text-[var(--text)] cursor-pointer whitespace-nowrap min-w-[120px] sm:min-w-[160px]"
            aria-label="Search"
            title="Universal search"
          >
            <Search className="w-3 h-3 shrink-0" />
            <span className="truncate">Search...</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectArtist(null);
              onNavigate('home');
            }}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
          >
            All artists
          </button>
        </div>
      </div>

      {/* Nav items wrapped cleanly without horizontal scroll */}
      <nav className="flex flex-wrap gap-1 text-[11px]">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-1.5 py-0.5 rounded-[3px] border cursor-pointer leading-tight transition-none whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--border)]'
                  : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border-light)] hover:border-[var(--border-light)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
