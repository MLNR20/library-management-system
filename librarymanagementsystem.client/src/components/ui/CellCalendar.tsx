import { useState } from 'react';
import type { ReactNode } from 'react';

const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
);

const pad = (n: number) => String(n).padStart(2, '0');

/** A local date as the yyyy-MM-dd string a date input holds. */
const toKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** The local day an instant falls on, as yyyy-MM-dd. */
export const dayKey = (date: Date) => toKey(date.getFullYear(), date.getMonth(), date.getDate());

/** The first of the month a yyyy-MM-dd string falls in. */
const monthOf = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1);
};

interface Props {
    /** The day last chosen, local yyyy-MM-dd; it is outlined. */
    value: string;
    /** Called with the day a reader clicks. */
    onSelect: (value: string) => void;
    /** The earliest day that can be chosen, local yyyy-MM-dd. Earlier days are greyed out. */
    min?: string;
    /** Something to show in a day's cell under its number, e.g. a count. */
    renderDay?: (key: string) => ReactNode;
    /** Buttons at the right of the header, after the month arrows. */
    actions?: ReactNode;
    /** Shown under the header, above the days: a key to what the cells mean. */
    legend?: ReactNode;
}

/** A full-width month of bordered day cells. Clicking a day reports it; today's number is filled, the chosen day outlined. */
export function CellCalendar({ value, onSelect, min, renderDay, actions, legend }: Props) {
    const [shown, setShown] = useState(() => monthOf(value));
    const today = dayKey(new Date());

    const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array.from({ length: shown.getDay() }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Fill the last week so the grid keeps its right and bottom borders.
    while (cells.length % 7 !== 0) cells.push(null);

    // Do not page back to months in which nothing can be chosen.
    const canGoBack = !min || dayKey(shown) > dayKey(monthOf(min));
    const moveMonth = (by: number) => setShown(current => new Date(current.getFullYear(), current.getMonth() + by, 1));

    return (
        <section aria-label="Choose a date" className="w-full">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-circle text-xl"
                        aria-label="Previous month"
                        disabled={!canGoBack}
                        onClick={() => moveMonth(-1)}
                    >
                        ‹
                    </button>
                    <h3 className="min-w-40 text-center text-lg font-bold">
                        {shown.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h3>
                    <button type="button" className="btn btn-ghost btn-sm btn-circle text-xl" aria-label="Next month" onClick={() => moveMonth(1)}>
                        ›
                    </button>
                </div>
                {actions}
            </div>
            {legend && <div className="mb-3">{legend}</div>}

            <div className="grid w-full grid-cols-7 border-t border-l border-base-content/15">
                {weekdays.map(day => (
                    <span key={day} className="border-r border-b border-base-content/15 bg-base-200 py-2 text-center text-xs font-medium uppercase opacity-70">
                        {day}
                    </span>
                ))}
                {cells.map((day, index) => {
                    // White and gray alternate cell by cell; with seven columns that makes a checkerboard.
                    const shade = index % 2 === 0 ? 'bg-base-100' : 'bg-base-200';

                    if (day === null) return <span key={`blank-${index}`} className={`min-h-[6rem] border-r border-b border-base-content/15 sm:min-h-[8rem] ${shade}`} />;

                    const key = toKey(shown.getFullYear(), shown.getMonth(), day);
                    const isToday = key === today;
                    const disabled = min !== undefined && key < min;

                    return (
                        <button
                            key={day}
                            type="button"
                            disabled={disabled}
                            aria-pressed={key === value}
                            aria-current={isToday ? 'date' : undefined}
                            aria-label={new Date(shown.getFullYear(), shown.getMonth(), day).toLocaleDateString(undefined, { dateStyle: 'full' })}
                            onClick={() => onSelect(key)}
                            className={`flex min-h-[6rem] flex-col items-start gap-1 border-r border-b border-base-content/15 p-1.5 text-left transition sm:min-h-[8rem] sm:p-2 ${shade} ${
                                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-base-300'
                            } ${key === value ? 'outline-2 -outline-offset-2 outline-purple-600' : ''}`}
                        >
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                                    isToday ? 'bg-purple-600 font-bold text-white' : disabled ? '' : 'font-bold'
                                }`}
                            >
                                {day}
                            </span>
                            {renderDay?.(key)}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
