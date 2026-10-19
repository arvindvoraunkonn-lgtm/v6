'use client';

import React from 'react';

export interface ThemeSettings {
  darkMode: boolean;
  bgColor: string;
  textColor: string;
  // When true, all content views (artworks, achievements, releases, notes,
  // lyrics, inbox, etc.) expand to full viewport width — the centered
  // max-w-* container is removed. Toggled in Settings → Appearance.
  fullView: boolean;
}

interface SettingsViewProps {
  jasmineEnabled: boolean;
  daisyEnabled: boolean;
  beeEnabled: boolean;
  onToggleJasmine: (enabled: boolean) => void;
  onToggleDaisy: (enabled: boolean) => void;
  onToggleBee: (enabled: boolean) => void;
  // New Misc sub-features — each can be turned off to declutter the Misc
  // page for users who don't need them.
  pressEnabled: boolean;
  merchEnabled: boolean;
  reelEnabled: boolean;
  dealsEnabled: boolean;
  onTogglePress: (enabled: boolean) => void;
  onToggleMerch: (enabled: boolean) => void;
  onToggleReel: (enabled: boolean) => void;
  onToggleDeals: (enabled: boolean) => void;
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
}

/**
 * Reusable On/Off toggle row — the existing JASmine / DAISY / Dark mode
 * rows all repeated the same JSX. Centralising it keeps the settings
 * page consistent and short.
 */
function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium" style={{ color: 'var(--text)' }}>{label}</div>
          {description && (
            <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {description}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggle(true)}
            className={`px-3 py-1 text-[11px] rounded-[3px] cursor-pointer whitespace-nowrap ${
              enabled ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'border'
            }`}
            style={enabled ? {} : { borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}
          >
            On
          </button>
          <button
            type="button"
            onClick={() => onToggle(false)}
            className={`px-3 py-1 text-[11px] rounded-[3px] cursor-pointer whitespace-nowrap ${
              !enabled ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'border'
            }`}
            style={!enabled ? {} : { borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}
          >
            Off
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsView({
  jasmineEnabled,
  daisyEnabled,
  beeEnabled,
  onToggleJasmine,
  onToggleDaisy,
  onToggleBee,
  pressEnabled,
  merchEnabled,
  reelEnabled,
  dealsEnabled,
  onTogglePress,
  onToggleMerch,
  onToggleReel,
  onToggleDeals,
  theme,
  onThemeChange,
}: SettingsViewProps) {
  return (
    <div className="w-full max-w-md mx-auto p-3 text-xs space-y-6">
      <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>Settings</span>
      </div>

      {/* Creative tools */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Creative tools
        </div>
        <ToggleRow
          label="JASmine"
          description="Lyrics search via lrclib"
          enabled={jasmineEnabled}
          onToggle={onToggleJasmine}
        />
        <ToggleRow
          label="DAISY"
          description="Song-title"
          enabled={daisyEnabled}
          onToggle={onToggleDaisy}
        />
        <ToggleRow
          label="Bee"
          description="Random word stream"
          enabled={beeEnabled}
          onToggle={onToggleBee}
        />
      </div>

      {/* Miscellaneous features — the sub-feature toggles shown on the Misc page */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Miscellaneous features
        </div>
        <ToggleRow
          label="Press"
          description="Press coverage log"
          enabled={pressEnabled}
          onToggle={onTogglePress}
        />
        <ToggleRow
          label="Merch"
          description="Per-persona merch catalog"
          enabled={merchEnabled}
          onToggle={onToggleMerch}
        />
        <ToggleRow
          label="Music Video"
          description="Music video tracker"
          enabled={reelEnabled}
          onToggle={onToggleReel}
        />
        <ToggleRow
          label="Deals"
          description="Samples, type beats, deals & clearances"
          enabled={dealsEnabled}
          onToggle={onToggleDeals}
        />
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Appearance
        </div>
        <ToggleRow
          label="Dark mode"
          enabled={theme.darkMode}
          onToggle={(enabled) => onThemeChange({ ...theme, darkMode: enabled })}
        />
        <ToggleRow
          label="Full view"
          description="Expand every page to full width"
          enabled={theme.fullView}
          onToggle={(enabled) => onThemeChange({ ...theme, fullView: enabled })}
        />
      </div>
    </div>
  );
}
