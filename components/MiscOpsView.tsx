'use client';

/**
 * MiscOpsView — four operational sub-features that live inside the
 * Miscellaneous page as separate tabs:
 *
 *   - PressTab  : press coverage log (interviews, reviews, podcasts…)
 *   - MerchTab  : per-persona merch catalog
 *   - ReelTab   : music video / visual project tracker
 *   - DealsTab  : sample / interpolation / type-beat / feature-deal
 *                 tracker (includes "planned purchase date" so the user
 *                 can see what's coming up).
 *
 * All four share the same visual pattern: a header with counts, a collapsible
 * add-form at the top, a list below with delete + persona filter. Each list
 * item is a small card with the title bolded, metadata muted, and an inline
 * status chip.
 *
 * The components are intentionally stateless about *which* persona is
 * selected in the top nav — they accept the full roster and let the user
 * filter / assign from within. This keeps them globally useful (a press
 * mention of persona A might be added while you're working on persona B).
 */

import React, { useMemo, useState } from 'react';
import {
  Artist,
  PressCoverage,
  PressKind,
  MerchItem,
  MerchStatus,
  VideoProject,
  VideoKind,
  VideoStatus,
  SampleClearance,
  DealKind,
  DealStatus,
} from '../lib/types';
import { CustomDropdown } from './CustomDropdown';
import { ExternalLink, Trash2 } from 'lucide-react';

interface PersonaPropOptions {
  artists: Artist[];
}

// Build the persona-options list once per render. Returns [{value,label}]
// including an explicit "—" entry for "no persona / shared".
function usePersonaOptions({ artists }: PersonaPropOptions) {
  return useMemo(
    () =>
      [
        { value: '', label: '— None / shared —' },
        ...artists.map((a) => ({ value: a.id, label: a.name })),
      ],
    [artists]
  );
}

// Small status chip — accent-coloured pill, matches the rest of the app.
function StatusChip({ label }: { label: string }) {
  return (
    <span className="text-[9px] uppercase tracking-wide text-[var(--accent-text)] bg-[var(--accent)] px-1 py-0.5 rounded-[2px] align-middle whitespace-nowrap">
      {label}
    </span>
  );
}

// Helper: render a kind/status dropdown with consistent styling.
function KindDropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (val: T) => void;
}) {
  return (
    <CustomDropdown
      value={value}
      options={options.map((o) => ({ value: o, label: o }))}
      onChange={(val) => onChange(val as T)}
    />
  );
}

// Resolve persona id -> name, returns "—" if unassigned.
function personaName(artists: Artist[], id?: string): string {
  if (!id) return '—';
  const a = artists.find((x) => x.id === id);
  return a ? a.name : '—';
}

// ===========================================================================
// PRESS
// ===========================================================================

const PRESS_KINDS: PressKind[] = [
  'interview',
  'review',
  'feature',
  'podcast',
  'tv appearance',
  'playlist placement',
  'other',
];

interface PressTabProps {
  items: PressCoverage[];
  artists: Artist[];
  onAdd: (item: PressCoverage) => void;
  onDelete: (id: string) => void;
}

export function PressTab({ items, artists, onAdd, onDelete }: PressTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<PressCoverage, 'id' | 'createdAt'>>({
    personaId: '',
    outlet: '',
    title: '',
    url: '',
    kind: 'interview',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const personaOptions = usePersonaOptions({ artists });

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
      ),
    [items]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.outlet.trim() || !form.title.trim()) return;
    onAdd({
      id: 'press_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      personaId: form.personaId || undefined,
      url: form.url.trim(),
      notes: form.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setForm({
      personaId: '',
      outlet: '',
      title: '',
      url: '',
      kind: 'interview',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    // keep the form open for batch entry
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-muted)]">{items.length} press mention{items.length === 1 ? '' : 's'}</span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[10px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-2 border border-[var(--border)] rounded-[3px] space-y-2 bg-[var(--bg-secondary)]"
        >
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text)]">
            <span>New press mention</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Outlet</label>
              <input
                type="text"
                value={form.outlet}
                onChange={(e) => setForm({ ...form, outlet: e.target.value })}
                placeholder="Pitchfork, Complex, XXL…"
                required
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Persona</label>
              <CustomDropdown
                value={form.personaId || ''}
                options={personaOptions}
                onChange={(val) => setForm({ ...form, personaId: val })}
                emptyLabel="— None / shared —"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Article / segment title"
              required
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Kind</label>
            <KindDropdown
              value={form.kind}
              options={PRESS_KINDS}
              onChange={(val) => setForm({ ...form, kind: val })}
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px] resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-faint)] text-[11px]">
          No press logged yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {sorted.map((p) => (
            <div key={p.id} className="py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[12px] text-[var(--text)] truncate">{p.outlet}</span>
                    <StatusChip label={p.kind} />
                  </div>
                  <div className="text-[12px] text-[var(--text)] truncate">{p.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {p.date} · persona: {personaName(artists, p.personaId)}
                  </div>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--text-muted)] underline hover:text-[var(--text)] inline-flex items-center gap-0.5 mt-0.5"
                    >
                      Read <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {p.notes && (
                    <div className="text-[11px] text-[var(--text-muted)] italic mt-1">{p.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer p-1 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// MERCH
// ===========================================================================

const MERCH_STATUSES: MerchStatus[] = [
  'idea',
  'designed',
  'produced',
  'in-stock',
  'sold-out',
  'archived',
];

const MERCH_CATEGORIES = ['apparel', 'vinyl', 'cd', 'digital', 'accessory', 'bundle', 'poster', 'other'];

interface MerchTabProps {
  items: MerchItem[];
  artists: Artist[];
  onAdd: (item: MerchItem) => void;
  onDelete: (id: string) => void;
}

export function MerchTab({ items, artists, onAdd, onDelete }: MerchTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<MerchItem, 'id' | 'createdAt'>>({
    personaId: '',
    name: '',
    category: 'apparel',
    price: '',
    status: 'idea',
    dropDate: '',
    url: '',
    notes: '',
  });
  const personaOptions = usePersonaOptions({ artists });

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      id: 'merch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      personaId: form.personaId || undefined,
      name: form.name.trim(),
      price: form.price?.trim() || undefined,
      dropDate: form.dropDate || undefined,
      url: form.url?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setForm({
      personaId: '',
      name: '',
      category: 'apparel',
      price: '',
      status: 'idea',
      dropDate: '',
      url: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-muted)]">{items.length} item{items.length === 1 ? '' : 's'}</span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[10px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-2 border border-[var(--border)] rounded-[3px] space-y-2 bg-[var(--bg-secondary)]"
        >
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text)]">
            <span>New merch item</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Persona</label>
              <CustomDropdown
                value={form.personaId || ''}
                options={personaOptions}
                onChange={(val) => setForm({ ...form, personaId: val })}
                emptyLabel="— None / shared —"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Category</label>
              <KindDropdown
                value={form.category}
                options={MERCH_CATEGORIES}
                onChange={(val) => setForm({ ...form, category: val })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Price</label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="$45"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Drop date</label>
              <input
                type="date"
                value={form.dropDate}
                onChange={(e) => setForm({ ...form, dropDate: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Status</label>
              <KindDropdown
                value={form.status}
                options={MERCH_STATUSES}
                onChange={(val) => setForm({ ...form, status: val })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Store URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px] resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-faint)] text-[11px]">
          No merch yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {sorted.map((m) => (
            <div key={m.id} className="py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[12px] text-[var(--text)] truncate">{m.name}</span>
                    <StatusChip label={m.status} />
                    {m.price && (
                      <span className="text-[10px] text-[var(--text-muted)]">{m.price}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {m.category} · {personaName(artists, m.personaId)}
                    {m.dropDate && ` · drop ${m.dropDate}`}
                  </div>
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--text-muted)] underline hover:text-[var(--text)] inline-flex items-center gap-0.5 mt-0.5"
                    >
                      Store <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {m.notes && (
                    <div className="text-[11px] text-[var(--text-muted)] italic mt-1">{m.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(m.id)}
                  className="text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer p-1 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// REEL — music video / visual project tracker
// ===========================================================================

const VIDEO_KINDS: VideoKind[] = [
  'music video',
  'visualiser',
  'lyric video',
  'behind the scenes',
  'live performance',
  'other',
];

const VIDEO_STATUSES: VideoStatus[] = [
  'idea',
  'planned',
  'shot',
  'edited',
  'uploaded',
  'public',
];

interface ReelTabProps {
  items: VideoProject[];
  artists: Artist[];
  releases: { id: string; title: string }[];
  onAdd: (item: VideoProject) => void;
  onDelete: (id: string) => void;
}

export function ReelTab({ items, artists, releases, onAdd, onDelete }: ReelTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<VideoProject, 'id' | 'createdAt'>>({
    personaId: '',
    releaseId: '',
    title: '',
    kind: 'music video',
    director: '',
    status: 'idea',
    budget: '',
    shootDate: '',
    releaseDate: '',
    url: '',
    notes: '',
  });
  const personaOptions = usePersonaOptions({ artists });
  const releaseOptions = useMemo(
    () =>
      [
        { value: '', label: '— None —' },
        ...releases.map((r) => ({ value: r.id, label: r.title })),
      ],
    [releases]
  );

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.shootDate || b.releaseDate || b.createdAt).getTime() -
          new Date(a.shootDate || a.releaseDate || a.createdAt).getTime()
      ),
    [items]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({
      id: 'reel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      personaId: form.personaId || undefined,
      releaseId: form.releaseId || undefined,
      title: form.title.trim(),
      director: form.director?.trim() || undefined,
      budget: form.budget?.trim() || undefined,
      shootDate: form.shootDate || undefined,
      releaseDate: form.releaseDate || undefined,
      url: form.url?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setForm({
      personaId: '',
      releaseId: '',
      title: '',
      kind: 'music video',
      director: '',
      status: 'idea',
      budget: '',
      shootDate: '',
      releaseDate: '',
      url: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-muted)]">{items.length} project{items.length === 1 ? '' : 's'}</span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[10px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-2 border border-[var(--border)] rounded-[3px] space-y-2 bg-[var(--bg-secondary)]"
        >
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text)]">
            <span>New video project</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Persona</label>
              <CustomDropdown
                value={form.personaId || ''}
                options={personaOptions}
                onChange={(val) => setForm({ ...form, personaId: val })}
                emptyLabel="— None —"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Release</label>
              <CustomDropdown
                value={form.releaseId || ''}
                options={releaseOptions}
                onChange={(val) => setForm({ ...form, releaseId: val })}
                emptyLabel="— None —"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Kind</label>
              <KindDropdown
                value={form.kind}
                options={VIDEO_KINDS}
                onChange={(val) => setForm({ ...form, kind: val })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Status</label>
              <KindDropdown
                value={form.status}
                options={VIDEO_STATUSES}
                onChange={(val) => setForm({ ...form, status: val })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Director</label>
              <input
                type="text"
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Budget</label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="$5,000"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Shoot date</label>
              <input
                type="date"
                value={form.shootDate}
                onChange={(e) => setForm({ ...form, shootDate: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Release date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://youtube.com/…"
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px] resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-faint)] text-[11px]">
          No video projects yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {sorted.map((v) => (
            <div key={v.id} className="py-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[12px] text-[var(--text)] truncate">{v.title}</span>
                    <StatusChip label={v.status} />
                    <StatusChip label={v.kind} />
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {personaName(artists, v.personaId)}
                    {v.director && ` · dir. ${v.director}`}
                    {v.budget && ` · ${v.budget}`}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {v.shootDate && `shoot ${v.shootDate}`}
                    {v.releaseDate && ` · release ${v.releaseDate}`}
                  </div>
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--text-muted)] underline hover:text-[var(--text)] inline-flex items-center gap-0.5 mt-0.5"
                    >
                      Watch <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {v.notes && (
                    <div className="text-[11px] text-[var(--text-muted)] italic mt-1">{v.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(v.id)}
                  className="text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer p-1 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// DEALS — samples, type beats, clearances, deals with planned purchase date
// ===========================================================================

const DEAL_KINDS: DealKind[] = [
  'sample',
  'interpolation',
  'type beat',
  'beat lease',
  'feature deal',
  'collab deal',
  'sync placement',
  'other',
];

const DEAL_STATUSES: DealStatus[] = [
  'idea',
  'inquiry',
  'negotiating',
  'pending',
  'purchased',
  'cleared',
  'denied',
  'expired',
];

interface DealsTabProps {
  items: SampleClearance[];
  artists: Artist[];
  onAdd: (item: SampleClearance) => void;
  onDelete: (id: string) => void;
}

export function DealsTab({ items, artists, onAdd, onDelete }: DealsTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<SampleClearance, 'id' | 'createdAt'>>({
    personaId: '',
    type: 'sample',
    title: '',
    source: '',
    counterparty: '',
    status: 'idea',
    cost: '',
    purchaseDate: '',
    plannedPurchaseDate: '',
    notes: '',
  });
  const personaOptions = usePersonaOptions({ artists });

  // Sort: upcoming planned purchases first (closest date first), then
  // already-purchased items (most recent first), then everything else
  // by created date. This surfaces "what's next" at the top.
  const today = new Date().toISOString().slice(0, 10);
  const sorted = useMemo(() => {
    const upcoming = items.filter(
      (i) => !i.purchaseDate && i.plannedPurchaseDate && i.plannedPurchaseDate >= today
    );
    const overdue = items.filter(
      (i) => !i.purchaseDate && i.plannedPurchaseDate && i.plannedPurchaseDate < today
    );
    const purchased = items.filter((i) => i.purchaseDate);
    const other = items.filter((i) => !i.purchaseDate && !i.plannedPurchaseDate);
    const byDateAsc = (a: SampleClearance, b: SampleClearance) =>
      (a.plannedPurchaseDate || '').localeCompare(b.plannedPurchaseDate || '');
    const byDateDesc = (a: SampleClearance, b: SampleClearance) =>
      (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
    const byCreatedDesc = (a: SampleClearance, b: SampleClearance) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return [
      ...overdue.sort(byDateAsc), // missed planned dates — most urgent
      ...upcoming.sort(byDateAsc), // upcoming planned dates
      ...purchased.sort(byDateDesc),
      ...other.sort(byCreatedDesc),
    ];
  }, [items, today]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({
      id: 'deal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...form,
      personaId: form.personaId || undefined,
      title: form.title.trim(),
      source: form.source?.trim() || undefined,
      counterparty: form.counterparty?.trim() || undefined,
      cost: form.cost?.trim() || undefined,
      purchaseDate: form.purchaseDate || undefined,
      plannedPurchaseDate: form.plannedPurchaseDate || undefined,
      notes: form.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setForm({
      personaId: '',
      type: 'sample',
      title: '',
      source: '',
      counterparty: '',
      status: 'idea',
      cost: '',
      purchaseDate: '',
      plannedPurchaseDate: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-muted)]">
          {items.length} deal{items.length === 1 ? '' : 's'}
          {(() => {
            const upcoming = items.filter(
              (i) => !i.purchaseDate && i.plannedPurchaseDate && i.plannedPurchaseDate >= today
            ).length;
            const overdue = items.filter(
              (i) => !i.purchaseDate && i.plannedPurchaseDate && i.plannedPurchaseDate < today
            ).length;
            const str: string[] = [];
            if (upcoming) str.push(`${upcoming} upcoming`);
            if (overdue) str.push(`${overdue} overdue`);
            return str.length ? ` · ${str.join(', ')}` : '';
          })()}
        </span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[10px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-2 border border-[var(--border)] rounded-[3px] space-y-2 bg-[var(--bg-secondary)]"
        >
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text)]">
            <span>New deal / clearance</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., 'Furious 2' type beat lease"
              required
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Type</label>
              <KindDropdown
                value={form.type}
                options={DEAL_KINDS}
                onChange={(val) => setForm({ ...form, type: val })}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Status</label>
              <KindDropdown
                value={form.status}
                options={DEAL_STATUSES}
                onChange={(val) => setForm({ ...form, status: val })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Persona</label>
              <CustomDropdown
                value={form.personaId || ''}
                options={personaOptions}
                onChange={(val) => setForm({ ...form, personaId: val })}
                emptyLabel="— None —"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Counterparty</label>
              <input
                type="text"
                value={form.counterparty}
                onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                placeholder="producer, label, owner…"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Source (URL or description)</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="https://beatstars.com/… or original sample name"
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Cost</label>
              <input
                type="text"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="$200"
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Purchased</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Plan to buy</label>
              <input
                type="date"
                value={form.plannedPurchaseDate}
                onChange={(e) => setForm({ ...form, plannedPurchaseDate: e.target.value })}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px] resize-y"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-faint)] text-[11px]">
          No deals tracked yet.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-light)]">
          {sorted.map((d) => {
            const isOverdue =
              !d.purchaseDate && d.plannedPurchaseDate && d.plannedPurchaseDate < today;
            return (
              <div key={d.id} className="py-2.5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[12px] text-[var(--text)] truncate">{d.title}</span>
                      <StatusChip label={d.type} />
                      <StatusChip label={d.status} />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {personaName(artists, d.personaId)}
                      {d.counterparty && ` · ${d.counterparty}`}
                      {d.cost && ` · ${d.cost}`}
                    </div>
                    {d.source && (
                      <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        source: {d.source}
                      </div>
                    )}
                    <div className="text-[10px] mt-0.5">
                      {d.purchaseDate ? (
                        <span className="text-[var(--text-muted)]">
                          purchased {d.purchaseDate}
                        </span>
                      ) : d.plannedPurchaseDate ? (
                        <span
                          className={
                            isOverdue
                              ? 'text-[var(--text)] font-medium'
                              : 'text-[var(--text-muted)]'
                          }
                        >
                          {isOverdue ? 'overdue — ' : 'plan to buy '}
                          {d.plannedPurchaseDate}
                        </span>
                      ) : (
                        <span className="text-[var(--text-faint)]">no date set</span>
                      )}
                    </div>
                    {d.notes && (
                      <div className="text-[11px] text-[var(--text-muted)] italic mt-1">{d.notes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(d.id)}
                    className="text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer p-1 shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
