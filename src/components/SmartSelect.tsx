import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SmartSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SmartSelectProps {
  value: string;
  options: SmartSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const SmartSelect: React.FC<SmartSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false)
    );
  }, [options, query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input and reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Keep highlight within bounds as the filtered list changes
  useEffect(() => {
    setHighlight(h => Math.min(Math.max(h, 0), Math.max(filteredOptions.length - 1, 0)));
  }, [filteredOptions.length]);

  // Keep the highlighted row scrolled into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.children[highlight] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const selectOption = (option: SmartSelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filteredOptions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const option = filteredOptions[highlight];
      if (option) selectOption(option);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={`truncate text-left ${selectedOption ? '' : 'text-gray-500 dark:text-gray-400'}`}>
          {selectedOption
            ? `${selectedOption.label}${selectedOption.sublabel ? ` - ${selectedOption.sublabel}` : ''}`
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                No results found
              </li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => selectOption(option)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${
                    index === highlight
                      ? 'bg-blue-50 dark:bg-blue-500/20'
                      : ''
                  }`}
                >
                  <span className="truncate text-gray-900 dark:text-white">
                    {option.label}
                    {option.sublabel && (
                      <span className="text-gray-500 dark:text-gray-400"> - {option.sublabel}</span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SmartSelect;
