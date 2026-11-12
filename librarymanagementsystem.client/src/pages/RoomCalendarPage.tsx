import { useMemo, useState } from 'react';
import { Page } from '../components/layout/Page.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { SectionModel, sectionHooks } from '../api/resources.ts';
import { useApproveRoomReservation, useRejectRoomReservation, useRoomReservations } from '../api/rooms.ts';
import type { RoomReservation } from '../api/rooms.ts';
import { formatReservationTime, ReservationStatus, reservationStatusBadges, reservationStatusLabels } from '../api/tables.ts';
import { getErrorMessage } from '../lib/api.ts';

// A month calendar of the reading-room reservations, for librarians and administrators to decide them in context:
// each request sits on the day it starts, coloured by its status, next to everything else booked that day.

/** How each status looks on the calendar: the colour of its chip, and the dot in the legend. */
const chipStyles: Record<ReservationStatus, string> = {
    [ReservationStatus.Pending]: 'border-warning bg-warning/15',
    [ReservationStatus.Approved]: 'border-success bg-success/15',
    [ReservationStatus.Rejected]: 'border-error/60 bg-error/10 line-through opacity-70',
    [ReservationStatus.Cancelled]: 'border-base-300 bg-base-200 line-through opacity-60',
};
const dotStyles: Record<ReservationStatus, string> = {
    [ReservationStatus.Pending]: 'bg-warning',
    [ReservationStatus.Approved]: 'bg-success',
    [ReservationStatus.Rejected]: 'bg-error',
    [ReservationStatus.Cancelled]: 'bg-base-300',
};
/** Chips shown in a day cell before the rest fold into "+N more". */
const CHIPS_PER_DAY = 3;

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** A local calendar day as yyyy-MM-dd, the key reservations are grouped by. */
function dayKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

/** The days on a month's calendar: whole weeks, Monday first, from the week the month starts in to the week it ends in. */
function monthGrid(month: Date) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const end = addDays(last, 6 - ((last.getDay() + 6) % 7));
    const days: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
    return days;
}

/** Librarians and administrators see every reading-room reservation on a month calendar and approve or reject them there. */
export function RoomCalendarPage() {
    const reservations = useRoomReservations();
    const rooms = sectionHooks.useList().data?.filter(section => section.model === SectionModel.ReadingRoom);
    const approve = useApproveRoomReservation();
    const reject = useRejectRoomReservation();

    // Taken once when the page opens, so the calendar does not shift under the librarian between renders.
    const [today] = useState(() => new Date());
    const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => dayKey(today));
    const [roomId, setRoomId] = useState('');
    const [onlyPending, setOnlyPending] = useState(false);
    const [open, setOpen] = useState<RoomReservation | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string>();

    const all = reservations.data ?? [];
    const pendingCount = all.filter(r => r.status === ReservationStatus.Pending).length;

    // Reservations by the local day they start on, earliest first.
    const byDay = useMemo(() => {
        const groups = new Map<string, RoomReservation[]>();
        for (const reservation of reservations.data ?? []) {
            if (roomId && reservation.sectionId !== roomId) continue;
            if (onlyPending && reservation.status !== ReservationStatus.Pending) continue;
            const key = dayKey(new Date(reservation.startUtc));
            groups.set(key, [...(groups.get(key) ?? []), reservation]);
        }
        for (const list of groups.values()) list.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
        return groups;
    }, [reservations.data, roomId, onlyPending]);

    const days = useMemo(() => monthGrid(month), [month]);
    const weekdays = days.slice(0, 7).map(day => weekdayFormatter.format(day));
    const todayKey = dayKey(today);
    const selected = byDay.get(selectedDay) ?? [];
    const selectedDate = new Date(`${selectedDay}T00:00`);

    const showMonth = (date: Date) => setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    const openReservation = (reservation: RoomReservation) => {
        setError(undefined);
        setRejecting(false);
        setReason('');
        setOpen(reservation);
    };
    const closeReservation = () => setOpen(null);
    const decideApprove = (reservation: RoomReservation) => {
        setError(undefined);
        approve.mutate(reservation.id, {
            onSuccess: closeReservation,
            onError: err => {
                closeReservation();
                setError(getErrorMessage(err));
            },
        });
    };

    return (
        <Page
            title="Room calendar"
            description="Every reading-room reservation on the day it starts. Click a request to approve or reject it; an approval holds the whole room and its tables, so it cannot overlap another approved room or table reservation."
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-warning">{pendingCount} waiting</span>
                    <select className="select select-sm w-48" value={roomId} onChange={e => setRoomId(e.target.value)} aria-label="Reading room">
                        <option value="">All reading rooms</option>
                        {(rooms ?? []).map(room => (
                            <option key={room.id} value={room.id}>
                                {room.name}
                            </option>
                        ))}
                    </select>
                    <label className="label cursor-pointer gap-2 text-sm">
                        <input type="checkbox" className="toggle toggle-sm toggle-warning" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
                        Waiting only
                    </label>
                </div>
            }
        >
            {error && (
                <div role="alert" className="alert alert-error alert-soft mb-4">
                    {error}
                </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button className="btn btn-sm btn-square" aria-label="Previous month" onClick={() => showMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                        ‹
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={() => {
                            showMonth(today);
                            setSelectedDay(todayKey);
                        }}
                    >
                        Today
                    </button>
                    <button className="btn btn-sm btn-square" aria-label="Next month" onClick={() => showMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                        ›
                    </button>
                    <h2 className="ml-2 text-lg font-semibold">{monthFormatter.format(month)}</h2>
                </div>
                <ul className="flex flex-wrap gap-3 text-xs opacity-80" aria-label="Legend">
                    {Object.values(ReservationStatus).map(status => (
                        <li key={status} className="flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${dotStyles[status]}`} />
                            {reservationStatusLabels[status]}
                        </li>
                    ))}
                </ul>
            </div>

            {reservations.isLoading ? (
                <span className="loading loading-spinner" />
            ) : reservations.isError ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load the reservations: {getErrorMessage(reservations.error)}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="grid min-w-[44rem] grid-cols-7 overflow-hidden rounded-box border border-base-300">
                        {weekdays.map(name => (
                            <div key={name} className="border-b border-base-300 bg-base-200 px-2 py-1.5 text-xs font-semibold uppercase opacity-70">
                                {name}
                            </div>
                        ))}
                        {days.map(day => {
                            const key = dayKey(day);
                            const list = byDay.get(key) ?? [];
                            const inMonth = day.getMonth() === month.getMonth();
                            const isSelected = key === selectedDay;
                            return (
                                <div
                                    key={key}
                                    className={`flex min-h-28 flex-col gap-1 border-b border-r border-base-300 p-1.5 ${inMonth ? '' : 'bg-base-200/50'} ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                                >
                                    <button
                                        className={`self-start rounded-full px-1.5 text-sm ${key === todayKey ? 'bg-primary font-semibold text-primary-content' : inMonth ? '' : 'opacity-40'}`}
                                        onClick={() => setSelectedDay(key)}
                                        aria-label={`Show ${dayFormatter.format(day)}`}
                                    >
                                        {day.getDate()}
                                    </button>
                                    {list.slice(0, CHIPS_PER_DAY).map(reservation => (
                                        <button
                                            key={reservation.id}
                                            className={`truncate rounded border-l-4 px-1.5 py-0.5 text-left text-xs ${chipStyles[reservation.status]}`}
                                            title={`${reservation.roomName} · ${reservation.userName} · ${reservationStatusLabels[reservation.status]}`}
                                            onClick={() => {
                                                setSelectedDay(key);
                                                openReservation(reservation);
                                            }}
                                        >
                                            <span className="font-semibold">{timeFormatter.format(new Date(reservation.startUtc))}</span>{' '}
                                            {reservation.roomName} · {reservation.userName}
                                        </button>
                                    ))}
                                    {list.length > CHIPS_PER_DAY && (
                                        <button className="link self-start text-xs opacity-70" onClick={() => setSelectedDay(key)}>
                                            +{list.length - CHIPS_PER_DAY} more
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Everything on the selected day, with the decisions to hand */}
            <section className="mt-6 flex flex-col gap-3" aria-label="Selected day">
                <h2 className="text-lg font-semibold">{dayFormatter.format(selectedDate)}</h2>
                {selected.length === 0 ? (
                    <p className="opacity-70">No reservations on this day.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {selected.map(reservation => (
                            <li key={reservation.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-box border-l-4 p-3 ${chipStyles[reservation.status]}`}>
                                <button className="flex flex-col text-left" onClick={() => openReservation(reservation)}>
                                    <span className="font-semibold">
                                        {formatReservationTime(reservation.startUtc, reservation.endUtc)} · {reservation.roomName}
                                    </span>
                                    <span className="text-sm opacity-80">
                                        {reservation.userName}
                                        {reservation.note && ` — ${reservation.note}`}
                                    </span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className={`badge ${reservationStatusBadges[reservation.status]}`}>{reservationStatusLabels[reservation.status]}</span>
                                    {reservation.status === ReservationStatus.Pending && (
                                        <>
                                            <button className="btn btn-success btn-sm" disabled={approve.isPending} onClick={() => decideApprove(reservation)}>
                                                Approve
                                            </button>
                                            <button
                                                className="btn btn-outline btn-error btn-sm"
                                                onClick={() => {
                                                    openReservation(reservation);
                                                    setRejecting(true);
                                                }}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <Modal open={open !== null} title="Room reservation" onClose={closeReservation} className="max-w-md">
                {open && (
                    <div className="flex flex-col gap-4">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="opacity-60">Room</dt>
                            <dd className="font-semibold">{open.roomName}</dd>
                            <dt className="opacity-60">Student</dt>
                            <dd>{open.userName}</dd>
                            <dt className="opacity-60">When</dt>
                            <dd>{formatReservationTime(open.startUtc, open.endUtc)}</dd>
                            <dt className="opacity-60">Purpose</dt>
                            <dd>{open.note ?? <span className="opacity-50">—</span>}</dd>
                            <dt className="opacity-60">Status</dt>
                            <dd>
                                <span className={`badge ${reservationStatusBadges[open.status]}`}>{reservationStatusLabels[open.status]}</span>
                                {open.decidedByName && <span className="ml-2 text-xs opacity-60">by {open.decidedByName}</span>}
                            </dd>
                            {open.decisionNote && (
                                <>
                                    <dt className="opacity-60">Reason</dt>
                                    <dd>{open.decisionNote}</dd>
                                </>
                            )}
                        </dl>

                        {open.status === ReservationStatus.Pending &&
                            (rejecting ? (
                                <form
                                    className="flex flex-col gap-3"
                                    onSubmit={event => {
                                        event.preventDefault();
                                        reject.mutate(
                                            { id: open.id, reason: reason.trim() || null },
                                            {
                                                onSuccess: closeReservation,
                                                onError: err => {
                                                    closeReservation();
                                                    setError(getErrorMessage(err));
                                                },
                                            },
                                        );
                                    }}
                                >
                                    <p className="text-sm">The student will see your reason.</p>
                                    <textarea
                                        className="textarea w-full"
                                        rows={3}
                                        maxLength={300}
                                        placeholder="Reason (optional)"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button type="button" className="btn btn-ghost" onClick={() => setRejecting(false)}>
                                            Back
                                        </button>
                                        <button className="btn btn-error" disabled={reject.isPending}>
                                            Reject
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex justify-end gap-2">
                                    <button className="btn btn-outline btn-error" onClick={() => setRejecting(true)}>
                                        Reject
                                    </button>
                                    <button className="btn btn-success" disabled={approve.isPending} onClick={() => decideApprove(open)}>
                                        Approve
                                    </button>
                                </div>
                            ))}
                        {open.status !== ReservationStatus.Pending && (
                            <div className="flex justify-end">
                                <button className="btn btn-ghost" onClick={closeReservation}>
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </Page>
    );
}
