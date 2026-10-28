import { useEffect, useState } from 'react';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
}

/** Controlled search box that debounces what it reports to the parent. */
export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    className = '',
}: SearchInputProps) {
    const [draft, setDraft] = useState(value);
    const [lastValue, setLastValue] = useState(value);

    // Follow the parent when it changes the value (e.g. "clear filters").
    if (value !== lastValue) {
        setLastValue(value);
        setDraft(value);
    }

    useEffect(() => {
        if (draft === value) return;
        const timer = setTimeout(() => onChange(draft), debounceMs);
        return () => clearTimeout(timer);
    }, [draft, value, debounceMs, onChange]);

    return (
        <label className={`input w-full ${className}`}>
            <svg
                className="h-4 w-4 opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="search"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {draft && (
                <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    aria-label="Clear search"
                    onClick={() => {
                        setDraft('');
                        onChange('');
                    }}
                >
                    ✕
                </button>
            )}
        </label>
    );
}
