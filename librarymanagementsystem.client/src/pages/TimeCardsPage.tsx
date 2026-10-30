import { useState } from 'react';
import { useTimeCards } from '../api/clock.ts';
import type { TimeCard, TimeCardFilters } from '../api/clock.ts';
import { useAuth } from '../auth/useAuth.ts';
import { Page } from '../components/layout/Page.tsx';
import { getErrorMessage } from '../lib/api.ts';

/** The API returns UTC instants, but ones read back from the database can arrive without a "Z". */
function parseUtc(value: string) {
    return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
}

const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function formatDay(isoDate: string) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTotal(hours: number, minutes: number) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function defaultFilters(): TimeCardFilters {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    // en-CA formats as yyyy-MM-dd, which is what <input type="date"> and the API use.
    return { from: from.toLocaleDateString('en-CA'), to: '' };
}

export function TimeCardsPage() {
    const { isAdmin } = useAuth();
    const [filters, setFilters] = useState<TimeCardFilters>(defaultFilters);
    const [staff, setStaff] = useState('');
    const cards = useTimeCards(filters);

    const everyone = cards.data ?? [];
    const staffNames = [...new Set(everyone.map(card => card.userName))].sort((a, b) => a.localeCompare(b));
    const visible = staff ? everyone.filter(card => card.userName === staff) : everyone;

    const totalMinutes = visible.reduce((sum, card) => sum + card.totalHours * 60 + card.totalMinutes, 0);
    const columnCount = isAdmin ? 4 : 3;

    return (
        <Page
            title="Time cards"
            description={
                isAdmin
                    ? 'Clock-ins and clock-outs for every user, newest day first.'
                    : 'Your clock-ins and clock-outs, newest day first.'
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    {isAdmin && (
                        <select className="select lg:w-56" aria-label="Staff member" value={staff} onChange={e => setStaff(e.target.value)}>
                            <option value="">All staff</option>
                            {staffNames.map(name => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                        <span className="opacity-70">From</span>
                        <input
                            type="date"
                            className="input"
                            value={filters.from}
                            max={filters.to || undefined}
                            onChange={e => setFilters(current => ({ ...current, from: e.target.value }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <span className="opacity-70">To</span>
                        <input
                            type="date"
                            className="input"
                            value={filters.to}
                            min={filters.from || undefined}
                            onChange={e => setFilters(current => ({ ...current, to: e.target.value }))}
                        />
                    </label>
                    <div className="text-sm lg:ml-auto" aria-live="polite">
                        <span className="opacity-70">Total in view: </span>
                        <span className="font-semibold">{formatTotal(Math.floor(totalMinutes / 60), totalMinutes % 60)}</span>
                    </div>
                </div>

                {cards.isError ? (
                    <div role="alert" className="alert alert-error alert-soft">
                        <span>Could not load time cards: {getErrorMessage(cards.error)}</span>
                        <button className="btn btn-sm" onClick={() => cards.refetch()}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    {isAdmin && <th>Staff</th>}
                                    <th>Clocked in → out</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.isPending ? (
                                    <tr>
                                        <td colSpan={columnCount} className="py-8 text-center">
                                            <span className="loading loading-spinner" aria-label="Loading time cards" />
                                        </td>
                                    </tr>
                                ) : visible.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnCount} className="py-8 text-center opacity-70">
                                            No clock-ins in this period.
                                        </td>
                                    </tr>
                                ) : (
                                    visible.map(card => <TimeCardRow key={card.id} card={card} showStaff={isAdmin} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Page>
    );
}

function TimeCardRow({ card, showStaff }: { card: TimeCard; showStaff: boolean }) {
    return (
        <tr className="hover:bg-base-200">
            <td className="whitespace-nowrap align-top">{formatDay(card.date)}</td>
            {showStaff && <td className="align-top">{card.userName}</td>}
            <td>
                <ul className="flex flex-col gap-1">
                    {card.entries.map(entry => (
                        <li key={entry.id} className="whitespace-nowrap">
                            {parseUtc(entry.clockInUtc).toLocaleTimeString([], timeFormat)}
                            {' → '}
                            {entry.clockOutUtc ? (
                                parseUtc(entry.clockOutUtc).toLocaleTimeString([], timeFormat)
                            ) : (
                                <span className="badge badge-soft badge-success badge-sm">Still clocked in</span>
                            )}
                        </li>
                    ))}
                </ul>
            </td>
            <td className="whitespace-nowrap text-right align-top font-medium">{formatTotal(card.totalHours, card.totalMinutes)}</td>
        </tr>
    );
}
