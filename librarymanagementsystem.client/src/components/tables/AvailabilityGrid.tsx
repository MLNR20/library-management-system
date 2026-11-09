import { ReservationStatus, reservationStatusLabels } from '../../api/tables.ts';

/** The hours the grid shows, in the viewer's local time. */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** One row of the grid: a table or a reading room. */
export interface AvailabilityRow {
    id: string;
    name: string;
    /** Tooltip for the row's name, e.g. its seats and where it is. */
    title?: string;
}

/** A taken stretch of one row. Approved holds it; Pending is requested but undecided. */
export interface AvailabilitySlot {
    rowId: string;
    startUtc: string;
    endUtc: string;
    status: ReservationStatus;
}

interface Props {
    rows: AvailabilityRow[];
    /** What is taken on `date`. */
    slots: AvailabilitySlot[];
    isError: boolean;
    /** Shown when there are no rows, e.g. "There are no tables to reserve yet." */
    emptyText: string;
    /** Ends the footnote, e.g. "A table is only yours once a librarian approves." */
    footnote: string;
    /** Local date, yyyy-MM-dd. */
    date: string;
    /** The slot the student is about to ask for, as local "HH:mm"; drawn as an outline on the chosen row. */
    from: string;
    to: string;
    selectedId: string;
    onSelect: (id: string) => void;
}

/** Position of an instant on the grid, as a percentage of the visible hours (clamped to the grid). */
function percentOf(instant: Date, date: string) {
    const dayStart = new Date(`${date}T00:00`).getTime() + DAY_START_HOUR * 3600000;
    const span = (DAY_END_HOUR - DAY_START_HOUR) * 3600000;
    return Math.min(100, Math.max(0, ((instant.getTime() - dayStart) / span) * 100));
}

/** When each table or room is taken on one day. Green is free; amber is requested; red is held. */
export function AvailabilityGrid({ rows, slots, isError, emptyText, footnote, date, from, to, selectedId, onSelect }: Props) {
    const previewStart = new Date(`${date}T${from}`);
    const previewEnd = new Date(`${date}T${to}`);
    const previewValid = previewEnd > previewStart;

    return (
        <section aria-labelledby="availability-heading" className="card card-border bg-base-100 shadow-sm">
            <div className="card-body gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="availability-heading" className="card-title">
                        Availability
                    </h2>
                    <ul className="flex flex-wrap items-center gap-3 text-xs" aria-label="Legend">
                        <li className="flex items-center gap-1">
                            <span className="inline-block size-3 rounded-sm bg-error" /> Reserved
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="inline-block size-3 rounded-sm bg-warning" /> Waiting for approval
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="inline-block size-3 rounded-sm border-2 border-primary" /> Your request
                        </li>
                    </ul>
                </div>

                {isError ? (
                    <div role="alert" className="alert alert-error alert-soft">
                        Could not load availability.
                    </div>
                ) : rows.length === 0 ? (
                    <p className="opacity-70">{emptyText}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[36rem]">
                            <div className="relative ml-28 h-5 text-xs opacity-70" aria-hidden="true">
                                {HOURS.filter(hour => hour % 2 === 0).map(hour => (
                                    <span
                                        key={hour}
                                        className="absolute -translate-x-1/2"
                                        style={{ left: `${((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }}
                                    >
                                        {hour}:00
                                    </span>
                                ))}
                            </div>

                            <ul className="flex flex-col gap-2">
                                {rows.map(row => {
                                    const rowSlots = slots.filter(slot => slot.rowId === row.id);
                                    const selected = row.id === selectedId;
                                    return (
                                        <li key={row.id} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onSelect(row.id)}
                                                aria-pressed={selected}
                                                className={`w-26 shrink-0 truncate rounded px-2 py-1 text-left text-sm ${
                                                    selected ? 'bg-primary text-primary-content font-bold' : 'hover:bg-base-200'
                                                }`}
                                                title={row.title ?? row.name}
                                            >
                                                {row.name}
                                            </button>

                                            <div className="relative h-8 flex-1 overflow-hidden rounded bg-success/20">
                                                {HOURS.slice(1, -1).map(hour => (
                                                    <span
                                                        key={hour}
                                                        aria-hidden="true"
                                                        className="absolute inset-y-0 border-l border-base-content/10"
                                                        style={{ left: `${((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }}
                                                    />
                                                ))}

                                                {rowSlots.map((slot, index) => {
                                                    const left = percentOf(new Date(slot.startUtc), date);
                                                    const right = percentOf(new Date(slot.endUtc), date);
                                                    if (right <= left) return null;
                                                    const approved = slot.status === ReservationStatus.Approved;
                                                    const label = `${reservationStatusLabels[slot.status]}: ${timeFormatter.format(new Date(slot.startUtc))} – ${timeFormatter.format(new Date(slot.endUtc))}`;
                                                    return (
                                                        <span
                                                            key={`${slot.startUtc}-${index}`}
                                                            title={label}
                                                            aria-label={`${row.name} ${label}`}
                                                            role="img"
                                                            className={`absolute inset-y-0 ${approved ? 'bg-error' : 'bg-warning'}`}
                                                            style={{ left: `${left}%`, width: `${right - left}%` }}
                                                        />
                                                    );
                                                })}

                                                {selected && previewValid && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute inset-y-0 rounded-sm border-2 border-primary"
                                                        style={{
                                                            left: `${percentOf(previewStart, date)}%`,
                                                            width: `${percentOf(previewEnd, date) - percentOf(previewStart, date)}%`,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                )}

                <p className="text-xs opacity-60">
                    Shows {DAY_START_HOUR}:00–{DAY_END_HOUR}:00 in your local time and updates on its own. {footnote}
                </p>
            </div>
        </section>
    );
}
