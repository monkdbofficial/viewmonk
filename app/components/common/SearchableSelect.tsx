'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Loader2, Check } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onClear?: () => void;
  className?: string;
}

/**
 * SearchableSelect Component
 *
 * A searchable dropdown with keyboard navigation and filtering.
 * Uses a portal to render the dropdown at document body level so it is never
 * clipped by overflow:hidden parents (e.g. map containers).
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  loading = false,
  disabled = false,
  error,
  onClear,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute position relative to viewport (fixed positioning)
  const calcStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};
    const r = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
      zIndex: 99999,
    };
  };

  // Close when clicking outside both the trigger and the portal dropdown
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Reposition on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => setDropdownStyle(calcStyle());
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus search input and scroll selected item into view when opened
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
    if (isOpen && value) {
      // Give the portal a tick to render, then scroll
      requestAnimationFrame(() => {
        dropdownRef.current
          ?.querySelector('[data-selected="true"]')
          ?.scrollIntoView({ block: 'nearest' });
      });
    }
  }, [isOpen]);

  // Reset highlighted index when search changes
  useEffect(() => { setHighlightedIndex(0); }, [searchTerm]);

  const openDropdown = () => {
    if (disabled) return;
    setDropdownStyle(calcStyle());
    if (!isOpen) {
      // Pre-highlight the currently selected item
      const idx = options.indexOf(value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
    setIsOpen(prev => !prev);
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (onClear) onClear();
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setDropdownStyle(calcStyle());
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) handleSelect(filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-lg border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
    >
      {/* Search Input */}
      <div className="border-b border-gray-200 p-3 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Options List */}
      <div className="max-h-72 overflow-y-auto py-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
            const isSelected = option === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={option}
                type="button"
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? isHighlighted
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200'
                      : 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : isHighlighted
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span>{option}</span>
                {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              <div>
                <p>No options found</p>
                {searchTerm && <p className="mt-1 text-xs">Try a different search term</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`relative w-full min-w-[180px] rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-all ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
        } ${
          disabled
            ? 'cursor-not-allowed bg-gray-100 opacity-50'
            : 'bg-white hover:border-gray-400 hover:shadow-sm'
        } dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={value ? 'truncate text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {value && onClear && !loading && (
              <span
                onClick={handleClear}
                className="cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                aria-label="Clear selection"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClear(e as any);
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Dropdown rendered via portal — escapes overflow:hidden and Leaflet z-index */}
      {isOpen && mounted && createPortal(dropdownContent, document.body)}

      {/* Error Message */}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
