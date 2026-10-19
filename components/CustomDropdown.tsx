'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  options: (Option | string)[];
  onChange: (value: string) => void;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
}

export function CustomDropdown({
  value,
  options,
  onChange,
  allowCustom = false,
  disabled = false,
  className = '',
  emptyLabel = 'Select...',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: Option[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(
    (o) => o.value.toLowerCase() === value.toLowerCase()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // If the user is mid-way through typing a custom value and clicks
        // outside, persist what they typed so it is never lost ("should not
        // fall / should not fail"). Empty values are ignored so the dropdown
        // behaves as a normal cancel.
        if (isAddingCustom && customInput.trim()) {
          onChange(customInput.trim());
        }
        setIsOpen(false);
        setIsAddingCustom(false);
        setCustomInput('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isAddingCustom, customInput, onChange]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setIsAddingCustom(false);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onChange(customInput.trim());
      setCustomInput('');
      setIsAddingCustom(false);
      setIsOpen(false);
    }
  };

  // Live-commit the typed value so the parent state stays in sync even if
  // the user never explicitly clicks "Ok" (e.g. presses Tab, switches focus,
  // or simply blurs away). This is the safety net that prevents the custom
  // label from being "lost" — the dropdown's button label updates as the
  // user types, so the value is always visible and recoverable.
  const handleCustomInputChange = (val: string) => {
    setCustomInput(val);
    if (val.trim()) {
      onChange(val.trim());
    }
  };

  // Enter key on the custom input commits the value. We use `keydown` so we
  // can call preventDefault() — this is what stops Enter from bubbling up to
  // the OUTER <form> (the Add-Artist / Edit-Profile form) which is what was
  // causing the page to "reload" and lose the user's in-progress fields.
  // Nested <form> elements are invalid HTML, so the browser would otherwise
  // treat Enter / the Ok submit-button as a submit of the OUTER form.
  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingCustom(false);
      setCustomInput('');
    }
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-1 px-1.5 border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text)] flex items-center justify-between rounded-[3px] hover:border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : value ? value : emptyLabel}
        </span>
        <ChevronDown className="w-3 h-3 ml-1 shrink-0 text-[var(--text-muted)]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[140px] max-h-52 overflow-y-auto z-50 bg-[var(--bg)] border border-[var(--border)] shadow-none rounded-[3px]">
          {normalizedOptions.length === 0 && !allowCustom && (
            <div className="p-1.5 text-[var(--text-faint)] italic text-[11px]">None</div>
          )}

          {normalizedOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-2 py-1 text-xs block cursor-pointer hover:bg-[var(--bg-hover)] ${
                opt.value.toLowerCase() === value.toLowerCase() ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent)]' : 'text-[var(--text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}

          {allowCustom && (
            <div className="border-t border-[var(--border-light)] p-1 bg-[var(--bg-secondary)]">
              {isAddingCustom ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => handleCustomInputChange(e.target.value)}
                    onKeyDown={handleCustomKeyDown}
                    onBlur={() => {
                      // If the user tabs away with text typed, persist it.
                      if (customInput.trim()) {
                        onChange(customInput.trim());
                      }
                    }}
                    autoFocus
                    placeholder="Type label…"
                    className="w-full text-xs py-0.5 px-1 border border-[var(--border-light)] bg-[var(--bg)] text-[var(--text)] rounded-[2px]"
                  />
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="px-1.5 py-0.5 text-xs bg-[var(--accent)] text-[var(--accent-text)] rounded-[2px] cursor-pointer"
                  >
                    Ok
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustom(false);
                      setCustomInput('');
                    }}
                    className="px-1.5 py-0.5 text-xs border border-[var(--border-light)] text-[var(--text-muted)] rounded-[2px] cursor-pointer"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="w-full text-left px-1.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  + Add custom...
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
