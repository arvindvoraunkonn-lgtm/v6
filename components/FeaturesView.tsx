'use client';

import React, { useState } from 'react';
import { FeaturePerson, Artist } from '../lib/types';
import { ButtonConfirmModal, TypedConfirmModal } from './ConfirmModal';
import { CustomDropdown } from './CustomDropdown';

interface FeaturesViewProps {
  features: FeaturePerson[];
  onAdd: (person: FeaturePerson) => void;
  onUpdate: (person: FeaturePerson) => void;
  onDelete: (id: string) => void;
  // Roster of personas — used to populate the "internal credit" dropdown
  // when adding/editing a featured person. When marked internal, the
  // person is one of the user's own personas (kept hidden in exports).
  allArtists: Artist[];
}

export function FeaturesView({
  features,
  onAdd,
  onUpdate,
  onDelete,
  allArtists,
}: FeaturesViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FeaturePerson | null>(null);

  // Modals
  const [confirmEditPerson, setConfirmEditPerson] = useState<FeaturePerson | null>(null);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState<FeaturePerson | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Artist');
  const [email, setEmail] = useState('');
  const [socialsInput, setSocialsInput] = useState('');
  const [projectsInput, setProjectsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedArtistId, setLinkedArtistId] = useState<string>('');

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingPerson(null);
    setName('');
    setRole('Artist');
    setEmail('');
    setSocialsInput('');
    setProjectsInput('');
    setNotes('');
    setLinkedArtistId('');
  };

  const handleStartEdit = (person: FeaturePerson) => {
    setConfirmEditPerson(person);
  };

  const handleConfirmEdit = () => {
    if (!confirmEditPerson) return;
    const p = confirmEditPerson;
    setEditingPerson(p);
    setName(p.name);
    setRole(p.role);
    setEmail(p.email || '');
    setSocialsInput((p.socialLinks || []).join('\n'));
    setProjectsInput((p.projectsWorkedOn || []).join('\n'));
    setNotes(p.notes || '');
    setLinkedArtistId(p.linkedArtistId || '');
    setIsAdding(false);
    setConfirmEditPerson(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const socialLinks = socialsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const projectsWorkedOn = projectsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingPerson) {
      const updated: FeaturePerson = {
        ...editingPerson,
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        socialLinks,
        projectsWorkedOn,
        notes: notes.trim(),
        linkedArtistId: linkedArtistId || undefined,
      };
      onUpdate(updated);
      setEditingPerson(null);
    } else {
      const newPerson: FeaturePerson = {
        id: 'feat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        socialLinks,
        projectsWorkedOn,
        notes: notes.trim(),
        linkedArtistId: linkedArtistId || undefined,
        createdAt: new Date().toISOString(),
      };
      onAdd(newPerson);
      setIsAdding(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-3 text-xs space-y-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
        <span className="font-semibold text-[var(--text)]">Features</span>
        {!isAdding && !editingPerson && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] rounded-[3px] text-[11px] text-[var(--text)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {/* Form for add or edit */}
      {(isAdding || editingPerson) && (
        <form onSubmit={handleSubmit} className="p-2 border border-[var(--border)] rounded-[3px] space-y-2 bg-[var(--bg-secondary)]">
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text)]">
            <span>{editingPerson ? 'Edit person' : 'New person'}</span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingPerson(null);
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Role</label>
              <CustomDropdown
                value={role}
                options={[
                  'Artist',
                  'Producer',
                  'Music video director',
                  'Audio engineer',
                  'Mixing engineer',
                  'Mastering engineer',
                  'Songwriter',
                  'Composer',
                  'Topliner',
                  'Creative director',
                  'Photographer',
                  'Stylist',
                  'Graphic designer',
                  'DP / cinematographer',
                  'Editor',
                  'Colorist',
                  'Publicist',
                  'A&R',
                  'Manager',
                  'Booking agent',
                  'Lawyer',
                  'Accountant',
                  'Distributor rep',
                ]}
                onChange={(val) => setRole(val)}
                allowCustom
              />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
              Social links (one per line)
            </label>
            <textarea
              rows={2}
              value={socialsInput}
              onChange={(e) => setSocialsInput(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
              Projects worked on / working on (one per line)
            </label>
            <textarea
              rows={2}
              value={projectsInput}
              onChange={(e) => setProjectsInput(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>

          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-[var(--border-light)] p-1 bg-[var(--bg)] text-[var(--text)] text-xs rounded-[2px]"
            />
          </div>

          {/* Internal credit toggle — same idea as in the ReleasesView credit
              editor. When toggled on, the user picks which of their personas
              this featured person actually is. Stored on the FeaturePerson
              as linkedArtistId. Exports / press kits show only the `name`
              field as-typed, never the internal linkage. */}
          <div className="pt-1 border-t border-[var(--border-light)] space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={!!linkedArtistId}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Default to the first persona if available
                    const first = allArtists[0];
                    setLinkedArtistId(first?.id || '');
                  } else {
                    setLinkedArtistId('');
                  }
                }}
                className="cursor-pointer"
              />
              Internal — this person is one of my personas
            </label>
            {linkedArtistId && (
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
                  Linked persona
                </label>
                <CustomDropdown
                  value={linkedArtistId}
                  options={allArtists.map((a) => ({ value: a.id, label: a.name }))}
                  onChange={(val) => setLinkedArtistId(val)}
                  emptyLabel="Select persona"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-1 bg-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] rounded-[3px] text-xs hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Save person
          </button>
        </form>
      )}

      {/* People list */}
      {!isAdding && !editingPerson && features.length === 0 && (
        <div className="py-8 text-center text-[var(--text-faint)] text-xs">No features recorded yet</div>
      )}

      {!isAdding && !editingPerson && features.length > 0 && (
        <div className="divide-y divide-[var(--border-light)]">
          {features.map((person) => {
            const linkedArtist = person.linkedArtistId
              ? allArtists.find((a) => a.id === person.linkedArtistId)
              : null;
            return (
              <div key={person.id} className="py-2.5 space-y-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-[var(--text)]">{person.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">({person.role})</span>
                      {/* Internal marker — only shown in the management UI.
                          Exports & press kits show only the name as-typed. */}
                      {linkedArtist && (
                        <span
                          className="text-[9px] uppercase tracking-wide text-[var(--accent-text)] bg-[var(--accent)] px-1 py-0.5 rounded-[2px]"
                          title={`Internal — refers to ${linkedArtist.name}`}
                        >
                          internal: {linkedArtist.name}
                        </span>
                      )}
                    </div>
                    {person.email && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">&lt;{person.email}&gt;</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(person)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePerson(person)}
                      className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)] underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {person.projectsWorkedOn && person.projectsWorkedOn.length > 0 && (
                  <div className="text-[11px] text-[var(--text-muted)] pl-2 border-l border-[var(--border-light)]">
                    <span className="font-medium text-[var(--text)]">Projects: </span>
                    {person.projectsWorkedOn.join(', ')}
                  </div>
                )}

                {person.socialLinks && person.socialLinks.length > 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-2">
                    {person.socialLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-[var(--text)]"
                      >
                        {link.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ))}
                  </div>
                )}

                {person.notes && (
                  <div className="text-[11px] text-[var(--text-muted)] italic">{person.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Button Confirmation for Editing Person (Yes on left, No on right) */}
      <ButtonConfirmModal
        isOpen={!!confirmEditPerson}
        title={`Edit ${confirmEditPerson?.name}?`}
        onConfirm={handleConfirmEdit}
        onCancel={() => setConfirmEditPerson(null)}
      />

      {/* Typed Confirmation for Deleting Person */}
      <TypedConfirmModal
        isOpen={!!confirmDeletePerson}
        title={confirmDeletePerson ? `Delete ${confirmDeletePerson.name}` : ''}
        expectedText="Delete"
        onConfirm={() => {
          if (confirmDeletePerson) {
            onDelete(confirmDeletePerson.id);
            setConfirmDeletePerson(null);
          }
        }}
        onCancel={() => setConfirmDeletePerson(null)}
      />
    </div>
  );
}
