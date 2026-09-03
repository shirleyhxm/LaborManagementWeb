import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLocale } from '../contexts/LocaleContext';
import type { RegionCode } from '../i18n/regions';

interface RegionSelectorProps {
  /** Collapsed sidebars show the flag alone. */
  compact?: boolean;
  /**
   * Which way the list opens. Defaults to 'up' for the sidebar footer, where
   * there is no room below; page headers need 'down'.
   */
  placement?: 'up' | 'down';
}

export function RegionSelector({
  compact = false,
  placement = 'up',
}: RegionSelectorProps) {
  const { t } = useTranslation();
  const { region, availableRegions, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape, the way the other popovers behave.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: RegionCode) => {
    setLocale(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('locale.switchRegion')}
        title={`${t('locale.switchRegion')}: ${region.label}`}
        className={`flex items-center gap-2 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 transition-colors hover:bg-neutral-50 ${
          compact ? 'justify-center px-2 py-2' : 'w-full px-3 py-2'
        }`}
      >
        {compact ? (
          <span aria-hidden="true">{region.flag}</span>
        ) : (
          <>
            <Globe className="h-4 w-4 shrink-0 text-neutral-500" />
            <span className="flex-1 truncate text-left">
              {region.flag} {region.shortLabel}
            </span>
            <span className="text-xs text-neutral-500">{region.currency}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('locale.switchRegion')}
          // Also anchored to whichever edge keeps the list on screen: a
          // sidebar control opens up and left, a header control down and right.
          className={`absolute z-50 w-56 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg ${
            placement === 'up' ? 'bottom-full mb-1 left-0' : 'top-full mt-1 right-0'
          }`}
        >
          {availableRegions.map((option) => {
            const isSelected = option.code === region.code;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 ${
                  isSelected ? 'bg-blue-50 text-blue-700' : 'text-neutral-700'
                }`}
              >
                <span aria-hidden="true">{option.flag}</span>
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-xs text-neutral-500">{option.currency}</span>
                {/* The check keeps its space when hidden, so the currency codes
                    stay on a common right edge instead of the unselected row's
                    sliding over into the empty slot. */}
                <Check
                  aria-hidden={!isSelected}
                  className={`h-4 w-4 shrink-0 ${isSelected ? '' : 'invisible'}`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
