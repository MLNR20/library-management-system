import { useState } from 'react';
import { formatReservationTime, reservationStatusLabels } from '../../api/tables.ts';
import { getErrorMessage } from '../../lib/api.ts';
import { ReservationCard } from './ReservationCard.tsx';
import type { ReservationItem } from './ReservationCard.tsx';

interface Props {
    id: string;
    heading: string;
    emptyText: string;
    items: ReservationItem[];
    isLoading: boolean;
    onCancel: (id: string) => void;
    cancelPending: boolean;
    cancelError: Error | null;
    /** The current time, for knowing which reservations can still be cancelled. */
    now: number;
}

/** Everything a card shows, as one lower-case string to search in. */
const searchText = (item: ReservationItem) =>
    [
        item.title,
        item.subtitle,
        item.note,
        item.decidedByName,
        item.decisionNote,
        reservationStatusLabels[item.status],
        formatReservationTime(item.startUtc, item.endUtc),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

type DateFilter = 'all' | 'upcoming' | 'today' | 'week' | 'month' | 'past';

const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All dates' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'past', label: 'Past' },
];

/** Whether a reservation touches the period [from, to), in the reader's local time. */
function inPeriod(item: ReservationItem, filter: DateFilter, now: number): boolean {
    const start = new Date(item.startUtc).getTime();
    const end = new Date(item.endUtc).getTime();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let from: Date;
    let to: Date;
    switch (filter) {
        case 'all':
            return true;
        case 'upcoming':
            return end > now;
        case 'past':
            return end <= now;
        case 'today':
            from = today;
            to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            break;
        case 'week':
            // Sunday to Saturday, as in the dashboard calendar.
            from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
            break;
        case 'month':
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            break;
    }
    return start < to.getTime() && end > from.getTime();
}

/** A student's own table or room reservations, one card each, with a search box and a date filter over them. */
export function MyReservations({ id, heading, emptyText, items, isLoading, onCancel, cancelPending, cancelError, now }: Props) {
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');

    const query = search.trim().toLowerCase();
    const visible = items.filter(item => inPeriod(item, dateFilter, now) && (!query || searchText(item).includes(query)));

    return (
        <section aria-labelledby={id}>
            <h2 id={id} className="mb-3 text-lg font-bold">
                {heading}
            </h2>
            {items.length > 0 && (
                <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                    <label className="input w-full">
                        <svg aria-hidden="true" className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, room, date, note or status"
                            aria-label={`Search ${heading.toLowerCase()}`}
                        />
                    </label>
                    <select
                        className="select w-full sm:w-48 sm:shrink-0"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value as DateFilter)}
                        aria-label="Filter by date"
                    >
                        {dateFilters.map(({ value, label }) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {isLoading ? (
                <span className="loading loading-spinner" />
            ) : items.length === 0 ? (
                <p className="opacity-70">{emptyText}</p>
            ) : visible.length === 0 ? (
                <p className="opacity-70">No reservations match your search and date filter.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {visible.map(item => (
                        <ReservationCard key={item.id} item={item} now={now} onCancel={onCancel} cancelPending={cancelPending} />
                    ))}
                </ul>
            )}
            {cancelError && (
                <div role="alert" className="alert alert-error alert-soft mt-3">
                    {getErrorMessage(cancelError)}
                </div>
            )}
        </section>
    );
}
