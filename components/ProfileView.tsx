'use client';

import React, { useState, useEffect } from 'react';
import { Artist, SocialLink, InspirationItem, SocialPlatform } from '../lib/types';
import { MAJOR_GENRES, getSubGenresForGenre, titleCaseGenre, formatGenreLabel } from '../lib/genres';
import { CustomDropdown } from './CustomDropdown';
import { TypedConfirmModal } from './ConfirmModal';
import { extractUsername } from './AddArtistView';
import { ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import { saveFileToDb, getBlobUrlForFileId, deleteFileFromDb } from '../lib/db';
import { ImageCropModal } from './ImageCropModal';

interface ProfileViewProps {
  artist: Artist;
  onUpdate: (updated: Artist) => void;
  onDelete: (artistId: string) => void;
  existingLabels: string[];
  customGenres: { [genre: string]: string[] };
  onAddCustomGenre: (genre: string, subGenre?: string) => void;
}

export function ProfileView({
  artist,
  onUpdate,
  onDelete,
  existingLabels,
  customGenres,
  onAddCustomGenre,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [name, setName] = useState(artist.name);
  const [actualName, setActualName] = useState(artist.actualName || '');
  const [biography, setBiography] = useState(artist.biography || '');
  const [socialDob, setSocialDob] = useState(artist.socialDob || '');
  const [label, setLabel] = useState(artist.label || '');
  const [genre, setGenre] = useState(artist.genre || '');
  const [subGenre, setSubGenre] = useState(artist.subGenre || '');
  const [style, setStyle] = useState(artist.style || '');
  const [averageBpm, setAverageBpm] = useState<number | string>(artist.averageBpm || '');
  const [category, setCategory] = useState<'independent' | 'dependent'>(artist.category || 'independent');
  const [distributor, setDistributor] = useState(artist.distributor || '');
  const [wikipediaUrl, setWikipediaUrl] = useState(artist.wikipediaUrl || '');
  const [socials, setSocials] = useState<SocialLink[]>(artist.socials || []);
  const [inspirations, setInspirations] = useState<InspirationItem[]>(artist.inspirations || []);

  // Profile image + banner state (URL or local file)
  const [profileImageUrl, setProfileImageUrl] = useState(artist.profileImageUrl || '');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImageRemoved, setProfileImageRemoved] = useState(false);
  const [bannerImageUrl, setBannerImageUrl] = useState(artist.bannerImageUrl || '');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImageRemoved, setBannerImageRemoved] = useState(false);

  // Crop modal state — accepts either a raw File (file picker) OR a CDN URL
  // (the URL input + a "Crop" button). When a URL is cropped, the resulting
  // File is saved to IndexedDB and the URL field is cleared so the local
  // cropped version takes precedence.
  const [cropTarget, setCropTarget] = useState<
    null | { file?: File; url?: string; aspect: number; title: string }
  >(null);

  // Live blob URL previews when a local file is selected (works in both view & edit mode)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  // Resolve stored file blob URLs for the view mode
  useEffect(() => {
    let mounted = true;
    let profileObjectUrl: string | null = null;
    let bannerObjectUrl: string | null = null;
    async function resolve() {
      if (artist.profileImageFileId && !profileImageRemoved) {
        const url = await getBlobUrlForFileId(artist.profileImageFileId!);
        if (mounted && url) {
          profileObjectUrl = url;
          setProfilePreviewUrl(url);
        }
      }
      if (artist.bannerImageFileId && !bannerImageRemoved) {
        const url = await getBlobUrlForFileId(artist.bannerImageFileId!);
        if (mounted && url) {
          bannerObjectUrl = url;
          setBannerPreviewUrl(url);
        }
      }
    }
    resolve();
    return () => {
      mounted = false;
      // Don't revoke cached blob URLs from getBlobUrlForFileId — they're cached globally.
    };
  }, [artist.profileImageFileId, artist.bannerImageFileId, profileImageRemoved, bannerImageRemoved]);

  // Generate local object URLs when user picks a new file in edit mode
  useEffect(() => {
    if (!profileImageFile) {
      // keep existing resolved blob url if any
      return;
    }
    const url = URL.createObjectURL(profileImageFile);
    setProfilePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setProfilePreviewUrl(null);
    };
  }, [profileImageFile]);

  useEffect(() => {
    if (!bannerImageFile) return;
    const url = URL.createObjectURL(bannerImageFile);
    setBannerPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setBannerPreviewUrl(null);
    };
  }, [bannerImageFile]);

  // The actual src to render for profile + banner (URL > file preview > none)
  const displayProfileSrc =
    profileImageRemoved ? null : (profileImageUrl || profilePreviewUrl || null);
  const displayBannerSrc =
    bannerImageRemoved ? null : (bannerImageUrl || bannerPreviewUrl || null);

  const builtInGenreList = MAJOR_GENRES.map((g) => g.genre);
  const customGenreList = Object.keys(customGenres);
  const allGenres = Array.from(new Set([...builtInGenreList, ...customGenreList]));
  const availableSubGenres = genre ? getSubGenresForGenre(genre, customGenres) : [];
  // Pass options as {value,label} objects so the dropdown shows the
  // title-cased label ("Indie Rock") while preserving the lowercase
  // stored value ("indie rock") for lookups and dedup.
  const genreOptions = allGenres.map((g) => ({ value: g, label: titleCaseGenre(g) }));
  const subGenreOptions = availableSubGenres.map((s) => ({ value: s, label: titleCaseGenre(s) }));

  const handleStartEdit = () => {
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirm(false);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Persist any newly selected local files to IndexedDB
    let profileImageFileId: string | undefined = artist.profileImageFileId;
    if (profileImageFile) {
      profileImageFileId = 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await saveFileToDb(profileImageFileId, profileImageFile, profileImageFile.name);
      // If replacing an older stored file, delete the old one to save space
      if (artist.profileImageFileId && artist.profileImageFileId !== profileImageFileId) {
        deleteFileFromDb(artist.profileImageFileId).catch(() => {});
      }
    } else if (profileImageRemoved) {
      if (artist.profileImageFileId) deleteFileFromDb(artist.profileImageFileId).catch(() => {});
      profileImageFileId = undefined;
    }

    let bannerImageFileId: string | undefined = artist.bannerImageFileId;
    if (bannerImageFile) {
      bannerImageFileId = 'ban_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await saveFileToDb(bannerImageFileId, bannerImageFile, bannerImageFile.name);
      if (artist.bannerImageFileId && artist.bannerImageFileId !== bannerImageFileId) {
        deleteFileFromDb(artist.bannerImageFileId).catch(() => {});
      }
    } else if (bannerImageRemoved) {
      if (artist.bannerImageFileId) deleteFileFromDb(artist.bannerImageFileId).catch(() => {});
      bannerImageFileId = undefined;
    }

    const updated: Artist = {
      ...artist,
      name: name.trim(),
      actualName: actualName.trim(),
      biography: biography.trim(),
      socialDob: socialDob.trim(),
      label: label.trim(),
      genre: genre.trim(),
      subGenre: subGenre.trim(),
      style: style.trim(),
      averageBpm: averageBpm || '',
      category,
      distributor: distributor.trim(),
      wikipediaUrl: wikipediaUrl.trim(),
      socials,
      inspirations,
      profileImageUrl: profileImageUrl.trim() || undefined,
      profileImageFileId,
      bannerImageUrl: bannerImageUrl.trim() || undefined,
      bannerImageFileId,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
    setIsEditing(false);
    setProfileImageFile(null);
    setBannerImageFile(null);
    setProfileImageRemoved(false);
    setBannerImageRemoved(false);
  };

  const handleAddSocial = () => {
    const newSocial: SocialLink = {
      id: 'soc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      platform: 'instagram',
      url: '',
      username: '',
      bioUsed: '',
      postCount: '',
      otherMediaCount: '',
    };
    setSocials([...socials, newSocial]);
  };

  const handleUpdateSocial = (id: string, updates: Partial<SocialLink>) => {
    setSocials(
      socials.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        if (updates.url && !updates.username) {
          const auto = extractUsername(updates.url, updated.platform);
          if (auto) updated.username = auto;
        }
        return updated;
      })
    );
  };

  const handleRemoveSocial = (id: string) => {
    setSocials(socials.filter((s) => s.id !== id));
  };

  const handleAddInspiration = () => {
    setInspirations([
      ...inspirations,
      {
        id: 'insp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        artistName: '',
        url: '',
      },
    ]);
  };

  const handleUpdateInspiration = (id: string, updates: Partial<InspirationItem>) => {
    setInspirations(
      inspirations.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveInspiration = (id: string) => {
    setInspirations(inspirations.filter((item) => item.id !== id));
  };

  // Crop modal renderer — shared by both view and edit modes (since a crop
  // could be triggered from either). The crop modal sits at z-50 above
  // everything else, so it can be returned at the end of either JSX branch.
  const renderCropModal = () => (
    <ImageCropModal
      isOpen={!!cropTarget}
      file={cropTarget?.file || null}
      url={cropTarget?.url || null}
      aspectRatio={cropTarget?.aspect || 1}
      title={cropTarget?.title || 'crop image'}
      onConfirm={(croppedFile) => {
        if (!cropTarget) return;
        if (cropTarget.aspect === 1) {
          setProfileImageFile(croppedFile);
          setProfileImageUrl('');
          setProfileImageRemoved(false);
        } else if (cropTarget.aspect === 3) {
          setBannerImageFile(croppedFile);
          setBannerImageUrl('');
          setBannerImageRemoved(false);
        }
        setCropTarget(null);
      }}
      onCancel={() => setCropTarget(null)}
    />
  );

  // VIEW MODE — Wikipedia-style article layout
  if (!isEditing) {
    // Build the infobox rows (only non-empty rows are shown)
    const infoboxRows: { label: string; value: React.ReactNode }[] = [];
    if (artist.actualName) {
      infoboxRows.push({ label: 'Also known as', value: artist.actualName });
    }
    if (artist.socialDob) {
      infoboxRows.push({ label: 'Born', value: artist.socialDob });
    }
    if (artist.genre) {
      infoboxRows.push({ label: 'Genre', value: formatGenreLabel(artist.genre) });
    }
    if (artist.subGenre) {
      infoboxRows.push({ label: 'Sub-genre', value: formatGenreLabel(artist.subGenre) });
    }
    if (artist.style) {
      infoboxRows.push({ label: 'Style', value: artist.style });
    }
    if (artist.averageBpm) {
      infoboxRows.push({ label: 'Average BPM', value: String(artist.averageBpm) });
    }
    if (artist.category) {
      infoboxRows.push({
        label: 'Category',
        value: artist.category.charAt(0).toUpperCase() + artist.category.slice(1),
      });
    }
    if (artist.label) {
      infoboxRows.push({ label: 'Label', value: artist.label });
    }
    if (artist.distributor) {
      infoboxRows.push({ label: 'Distributor', value: artist.distributor });
    }
    if (artist.wikipediaUrl) {
      infoboxRows.push({
        label: 'Wikipedia',
        value: (
          <a
            href={artist.wikipediaUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text)] underline hover:text-[var(--text-muted)] inline-flex items-center gap-1"
          >
            <span className="truncate">article</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ),
      });
    }

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-4 text-[13px] leading-relaxed space-y-5">
        {/* Article header — page title + controls */}
        <header className="flex items-start justify-between gap-3 pb-2 border-b-2 border-[var(--border)]">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[var(--text)] leading-tight tracking-tight">
              {artist.name}
            </h1>
            {artist.actualName && (
              <p className="text-[12px] italic text-[var(--text-muted)] mt-0.5">
                {artist.actualName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[11px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Delete
            </button>
          </div>
        </header>

        {/* Lead image + cover banner */}
        {displayBannerSrc && (
          <figure className="w-full">
            <div className="w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[3/1] bg-[var(--bg-hover)] border border-[var(--border-light)] rounded-[3px] overflow-hidden flex items-center justify-center relative">
              <img
                src={displayBannerSrc}
                alt={`${artist.name} banner`}
                className="w-full h-full object-cover"
              />
              {displayProfileSrc && (
                <div className="absolute left-3 -bottom-6 sm:left-4 sm:-bottom-7">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[var(--bg)] border-[3px] border-[var(--bg)] shadow-md overflow-hidden flex items-center justify-center ring-1 ring-[var(--border-light)]">
                    <img
                      src={displayProfileSrc}
                      alt={`${artist.name} profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
            <figcaption className="text-[10px] text-[var(--text-faint)] italic mt-1 text-center">
              Cover image
            </figcaption>
          </figure>
        )}

        {/* If there's no banner but a profile pic exists, show the avatar alone */}
        {!displayBannerSrc && displayProfileSrc && (
          <figure className="flex justify-center pt-2 pb-1">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[var(--bg)] border border-[var(--border-light)] shadow-md overflow-hidden flex items-center justify-center">
              <img
                src={displayProfileSrc}
                alt={`${artist.name} profile`}
                className="w-full h-full object-cover"
              />
            </div>
          </figure>
        )}

        {/* Spacer so the overlapping profile picture does not collide with the infobox */}
        {displayBannerSrc && displayProfileSrc && <div className="h-7 sm:h-8" />}

        {/* Lead paragraph — a short summary built from whatever we know,
            in the style of Wikipedia's lead section. Skipped entirely if
            no biography and no metadata at all. */}
        {(() => {
          const summaryParts: string[] = [];
          if (artist.actualName) summaryParts.push(`known professionally as ${artist.name}`);
          if (artist.genre) {
            summaryParts.push(`a ${formatGenreLabel(artist.genre).toLowerCase()}${artist.subGenre ? ` / ${formatGenreLabel(artist.subGenre).toLowerCase()}` : ''} artist`);
          }
          if (artist.label) summaryParts.push(`signed to ${artist.label}`);
          if (artist.distributor) summaryParts.push(`distributed by ${artist.distributor}`);
          if (artist.biography) {
            // Biography is rendered separately as its own section, so don't duplicate here.
          }
          if (summaryParts.length === 0) return null;
          return (
            <p className="text-[13px] text-[var(--text)] leading-relaxed">
              <span className="font-bold">{artist.name}</span> is{' '}
              {summaryParts.join(', ')}.
            </p>
          );
        })()}

        {/* Infobox — Wikipedia-style metadata table. Stacks on top of body
            on small screens, sits flush to the right edge on >= sm. */}
        {infoboxRows.length > 0 && (
          <aside className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-[3px] overflow-hidden text-[11px]">
            <div className="px-2 py-1 bg-[var(--bg-hover)] border-b border-[var(--border-light)] font-semibold text-[var(--text)] text-center">
              Artist information
            </div>
            <dl className="divide-y divide-[var(--border-light)]">
              {infoboxRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[110px_1fr] gap-2 px-2 py-1.5"
                >
                  <dt className="text-[var(--text-muted)] font-medium uppercase tracking-wide text-[10px] pt-px">
                    {row.label}
                  </dt>
                  <dd className="text-[var(--text)] break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        {/* Biography — full lead-section body */}
        {artist.biography && (
          <section>
            <h2 className="text-[14px] font-bold text-[var(--text)] border-b border-[var(--border-light)] pb-0.5 mb-2">
              Biography
            </h2>
            <div className="text-[13px] text-[var(--text)] whitespace-pre-wrap leading-relaxed">
              {artist.biography}
            </div>
          </section>
        )}

        {/* Socials — external links section */}
        {artist.socials && artist.socials.length > 0 && (
          <section>
            <h2 className="text-[14px] font-bold text-[var(--text)] border-b border-[var(--border-light)] pb-0.5 mb-2">
              Social media &amp; links
            </h2>
            <ul className="space-y-1.5">
              {artist.socials.map((s) => {
                const platformLabel =
                  s.platform === 'custom' && s.customTitle
                    ? s.customTitle
                    : titleCaseGenre(s.platform);
                return (
                  <li
                    key={s.id}
                    className="text-[12px] text-[var(--text-muted)] leading-relaxed"
                  >
                    <span className="text-[var(--text)] font-medium">
                      {platformLabel}:
                    </span>{' '}
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text)] underline hover:text-[var(--text-muted)]"
                      >
                        {s.username || s.url}
                      </a>
                    ) : (
                      <span className="text-[var(--text-faint)] italic">no url</span>
                    )}
                    {s.postCount && (
                      <span className="text-[var(--text-faint)] ml-1">
                        [{s.postCount} posts]
                      </span>
                    )}
                    {s.bioUsed && (
                      <div className="text-[var(--text-muted)] text-[11px] mt-0.5 pl-2 border-l border-[var(--border-light)]">
                        {s.bioUsed}
                      </div>
                    )}
                    {s.otherMediaCount && (
                      <div className="text-[var(--text-muted)] text-[11px] pl-2 border-l border-[var(--border-light)]">
                        {s.otherMediaCount}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Inspirations — styled-from section */}
        {artist.inspirations && artist.inspirations.length > 0 && (
          <section>
            <h2 className="text-[14px] font-bold text-[var(--text)] border-b border-[var(--border-light)] pb-0.5 mb-2">
              Inspiration &amp; styled from
            </h2>
            <ul className="space-y-1">
              {artist.inspirations.map((insp) => (
                <li
                  key={insp.id}
                  className="text-[12px] text-[var(--text-muted)] leading-relaxed"
                >
                  <span className="font-medium text-[var(--text)]">{insp.artistName}</span>
                  {insp.url && (
                    <span className="ml-1">
                      (
                      <a
                        href={insp.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-[var(--text)]"
                      >
                        link
                      </a>
                      )
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Typed Confirmations */}
        <TypedConfirmModal
          isOpen={showEditConfirm}
          title="Edit artist profile"
          expectedText="I want to edit"
          onConfirm={handleConfirmEdit}
          onCancel={() => setShowEditConfirm(false)}
        />

        <TypedConfirmModal
          isOpen={showDeleteConfirm}
          title={`Delete artist ${artist.name}`}
          expectedText={`I want to delete ${artist.name}`}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete(artist.id);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        {renderCropModal()}
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="w-full max-w-lg mx-auto p-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] mb-3">
        <span className="font-semibold text-[var(--text)]">Edit profile</span>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {/* Banner + Profile picture uploader */}
        <div className="space-y-2 border border-[var(--border-light)] rounded-[3px] p-2 bg-[var(--bg-secondary)]">
          {/* Banner upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-[var(--text-muted)]">Banner (wide image)</label>
              {(displayBannerSrc || bannerImageUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerImageFile(null);
                    setBannerImageUrl('');
                    setBannerImageRemoved(true);
                  }}
                  className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] underline cursor-pointer inline-flex items-center gap-0.5"
                >
                  <X className="w-2.5 h-2.5" /> Remove banner
                </button>
              )}
            </div>
            <div className="w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[3/1] bg-[var(--bg)] border border-[var(--border-light)] overflow-hidden flex items-center justify-center rounded-[3px] relative">
              {displayBannerSrc ? (
                <img
                  src={displayBannerSrc}
                  alt="banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-[10px] text-[var(--text-faint)] flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5" />
                  <span>Banner preview</span>
                </div>
              )}
            </div>
            <div className="flex gap-1 mt-1">
              <input
                type="url"
                placeholder="Cdn banner url"
                value={bannerImageUrl}
                onChange={(e) => {
                  setBannerImageUrl(e.target.value);
                  setBannerImageRemoved(false);
                }}
                className="flex-1 min-w-0 border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
              <button
                type="button"
                disabled={!bannerImageUrl.trim()}
                onClick={() => {
                  if (bannerImageUrl.trim()) {
                    setCropTarget({
                      url: bannerImageUrl.trim(),
                      aspect: 3,
                      title: 'crop banner',
                    });
                  }
                }}
                className="px-2 py-1 text-[11px] border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text)] rounded-[2px] hover:border-[var(--border)] cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Crop
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f) {
                  setCropTarget({ file: f, aspect: 3, title: 'crop banner' });
                }
                e.target.value = '';
              }}
              className="text-[11px] text-[var(--text-muted)] mt-1"
            />
          </div>

          {/* Profile picture upload */}
          <div className="pt-1 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-[var(--text-muted)]">Profile picture (square)</label>
              {(displayProfileSrc || profileImageUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileImageFile(null);
                    setProfileImageUrl('');
                    setProfileImageRemoved(true);
                  }}
                  className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] underline cursor-pointer inline-flex items-center gap-0.5"
                >
                  <X className="w-2.5 h-2.5" /> Remove profile
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full bg-[var(--bg)] border border-[var(--border-light)] overflow-hidden flex items-center justify-center">
                {displayProfileSrc ? (
                  <img
                    src={displayProfileSrc}
                    alt="profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-[var(--text)] uppercase">
                    {(name || '?').charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-1">
                  <input
                    type="url"
                    placeholder="Cdn profile image url"
                    value={profileImageUrl}
                    onChange={(e) => {
                      setProfileImageUrl(e.target.value);
                      setProfileImageRemoved(false);
                    }}
                    className="flex-1 min-w-0 border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                  />
                  <button
                    type="button"
                    disabled={!profileImageUrl.trim()}
                    onClick={() => {
                      if (profileImageUrl.trim()) {
                        setCropTarget({
                          url: profileImageUrl.trim(),
                          aspect: 1,
                          title: 'crop profile picture',
                        });
                      }
                    }}
                    className="px-2 py-1 text-[11px] border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text)] rounded-[2px] hover:border-[var(--border)] cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Crop
                  </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f) {
                      setCropTarget({ file: f, aspect: 1, title: 'crop profile picture' });
                    }
                    e.target.value = '';
                  }}
                  className="text-[11px] text-[var(--text-muted)]"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Artist name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Actual name</label>
          <input
            type="text"
            value={actualName}
            onChange={(e) => setActualName(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Biography</label>
          <textarea
            rows={4}
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Wikipedia url</label>
          <input
            type="url"
            value={wikipediaUrl}
            onChange={(e) => setWikipediaUrl(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Social dob</label>
          <input
            type="date"
            value={socialDob}
            onChange={(e) => setSocialDob(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Label</label>
          <CustomDropdown
            value={label}
            options={existingLabels}
            onChange={(val) => setLabel(val)}
            allowCustom
            emptyLabel="Choose or add label"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Genre</label>
            <CustomDropdown
              value={genre}
              options={genreOptions}
              onChange={(val) => {
                setGenre(val);
                setSubGenre('');
                if (!allGenres.includes(val)) {
                  onAddCustomGenre(val);
                }
              }}
              allowCustom
              emptyLabel="Select genre"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Sub genre</label>
            <CustomDropdown
              value={subGenre}
              options={subGenreOptions}
              onChange={(val) => {
                setSubGenre(val);
                if (genre && !availableSubGenres.includes(val)) {
                  onAddCustomGenre(genre, val);
                }
              }}
              allowCustom
              disabled={!genre}
              emptyLabel={genre ? 'Select sub genre' : 'Pick genre first'}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Style</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Average bpm</label>
            <input
              type="number"
              value={averageBpm}
              onChange={(e) => setAverageBpm(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Category</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategory('independent')}
              className={`flex-1 py-1 px-2 border rounded-[3px] cursor-pointer ${
                category === 'independent'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--border)]'
                  : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border-light)]'
              }`}
            >
              Independent
            </button>
            <button
              type="button"
              onClick={() => setCategory('dependent')}
              className={`flex-1 py-1 px-2 border rounded-[3px] cursor-pointer ${
                category === 'dependent'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--border)]'
                  : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border-light)]'
              }`}
            >
              Dependent
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[var(--text-muted)] mb-0.5">Distributor</label>
          <input
            type="text"
            value={distributor}
            onChange={(e) => setDistributor(e.target.value)}
            className="w-full border border-[var(--border-light)] p-1.5 bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
          />
        </div>

        {/* Socials Editor */}
        <div className="pt-2 border-t border-[var(--border-light)]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--text)] text-[11px]">Socials</span>
            <button
              type="button"
              onClick={handleAddSocial}
              className="text-[11px] underline text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              + Add social
            </button>
          </div>

          <div className="space-y-2">
            {socials.map((s) => (
              <div key={s.id} className="p-2 border border-[var(--border-light)] rounded-[3px] space-y-1 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between gap-1">
                  <div className="w-1/2">
                    <CustomDropdown
                      value={s.platform}
                      options={[
                        'instagram',
                        'x',
                        'facebook',
                        'spotify',
                        'apple music',
                        'mastodon',
                        'bluesky',
                        'youtube',
                        'tiktok',
                        'soundcloud',
                        'bandcamp',
                        'threads',
                        'custom',
                      ]}
                      onChange={(val) => handleUpdateSocial(s.id, { platform: val as SocialPlatform })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(s.id)}
                    className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer underline"
                  >
                    Remove
                  </button>
                </div>
                {s.platform === 'custom' && (
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Custom title</label>
                    <input
                      type="text"
                      value={s.customTitle || ''}
                      onChange={(e) => handleUpdateSocial(s.id, { customTitle: e.target.value })}
                      className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Url</label>
                  <input
                    type="url"
                    value={s.url}
                    onChange={(e) => handleUpdateSocial(s.id, { url: e.target.value })}
                    className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Username</label>
                    <input
                      type="text"
                      value={s.username}
                      onChange={(e) => handleUpdateSocial(s.id, { username: e.target.value })}
                      className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Posts</label>
                    <input
                      type="text"
                      value={s.postCount || ''}
                      onChange={(e) => handleUpdateSocial(s.id, { postCount: e.target.value })}
                      className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Bio used there</label>
                  <input
                    type="text"
                    value={s.bioUsed || ''}
                    onChange={(e) => handleUpdateSocial(s.id, { bioUsed: e.target.value })}
                    className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Other media / notes</label>
                  <input
                    type="text"
                    value={s.otherMediaCount || ''}
                    onChange={(e) => handleUpdateSocial(s.id, { otherMediaCount: e.target.value })}
                    className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inspirations */}
        <div className="pt-2 border-t border-[var(--border-light)]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-[var(--text)] text-[11px]">Inspiration / styled from</span>
            <button
              type="button"
              onClick={handleAddInspiration}
              className="text-[11px] underline text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              + Add inspiration
            </button>
          </div>
          <div className="space-y-1.5">
            {inspirations.map((item) => (
              <div key={item.id} className="p-1.5 border border-[var(--border-light)] rounded-[3px] bg-[var(--bg-secondary)] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--text-muted)]">Artist</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInspiration(item.id)}
                    className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] cursor-pointer underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={item.artistName}
                  onChange={(e) => handleUpdateInspiration(item.id, { artistName: e.target.value })}
                  className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                />
                <label className="block text-[10px] text-[var(--text-muted)]">Song link</label>
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => handleUpdateInspiration(item.id, { url: e.target.value })}
                  className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-1.5 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 bg-[var(--bg)] text-[var(--text)] border border-[var(--border-light)] rounded-[3px] text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
      {renderCropModal()}
    </div>
  );
}
