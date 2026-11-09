import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Page } from '../layout/Page.tsx';
import { findOverlap, MAX_RESERVATION_HOURS, ReservationStatus } from '../../api/tables.ts';
import { getErrorMessage } from '../../lib/api.ts';
import { AvailabilityGrid } from './AvailabilityGrid.tsx';
import type { AvailabilityRow, AvailabilitySlot } from './AvailabilityGrid.tsx';
import { MyReservations } from './MyReservations.tsx';
import type { ReservationItem } from './MyReservations.tsx';

const todayLocal = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** What a student asks for, whether a table or a whole room. */
export interface ReservationBody {
    targetId: string;
    startUtc: string;
    endUtc: string;
    note: string | null;
    /** Same for a retry of the same request, new for a different one. */
    idempotencyKey: string;
}

interface Props {
    title: string;
    description: string;
    /** What is being reserved, lower case with its article, e.g. "table" / "reading room". */
    noun: string;
    /** Label of the choice, e.g. "Table" / "Reading room". */
    targetLabel: string;
    notePlaceholder: string;
    /** The things that can be reserved, for the form and the grid. */
    rows: AvailabilityRow[];
    /** The label shown for a row in the form's drop-down. */
    optionLabel: (row: AvailabilityRow) => string;
    emptyText: string;
    footnote: string;
    /** What is taken on a day (a hook: called on every render). */
    useAvailability: (date: string) => { data: AvailabilitySlot[] | undefined; isError: boolean };
    submit: (body: ReservationBody, options: { onSuccess: () => void; onError: (error: Error) => void }) => void;
    submitting: boolean;
    myHeading: string;
    myEmptyText: string;
    mine: ReservationItem[];
    mineLoading: boolean;
    cancel: (id: string) => void;
    cancelling: boolean;
    cancelError: Error | null;
}

/** Students file a request for a table or a room; it only holds it once a librarian approves it. */
export function ReservationRequestPage(props: Props) {
    const { noun, targetLabel } = props;

    const [targetId, setTargetId] = useState('');
    const [date, setDate] = useState(todayLocal());
    const [from, setFrom] = useState('14:00');
    const [to, setTo] = useState('16:00');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string>();
    const [sent, setSent] = useState(false);
    const attempt = useRef<{ signature: string; key: string } | null>(null);

    const availability = props.useAvailability(date);
    const slots = availability.data ?? [];
    const ofTarget = slots.filter(slot => slot.rowId === targetId);
    const reserved = targetId ? findOverlap(ofTarget, ReservationStatus.Approved, date, from, to) : undefined;
    const alsoRequested = targetId && !reserved ? findOverlap(ofTarget, ReservationStatus.Pending, date, from, to) : undefined;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSent(false);

        const start = new Date(`${date}T${from}`);
        const end = new Date(`${date}T${to}`);
        if (!targetId) return setError(`Choose a ${noun}.`);
        if (!(end > start)) return setError('The reservation must end after it starts.');
        if (start <= new Date()) return setError('The reservation must start in the future.');
        if ((end.getTime() - start.getTime()) / 3600000 > MAX_RESERVATION_HOURS) {
            return setError(`A reservation can last at most ${MAX_RESERVATION_HOURS} hours.`);
        }

        if (reserved) return setError(`That ${noun} is already reserved for part of that time. Pick a free slot in the availability view.`);

        if (props.submitting) return;

        // The same key for the same request, so a double click or a retry after a dropped response cannot book twice.
        const body = { targetId, startUtc: start.toISOString(), endUtc: end.toISOString(), note: note.trim() || null };
        const signature = JSON.stringify(body);
        if (attempt.current?.signature !== signature) {
            attempt.current = { signature, key: crypto.randomUUID() };
        }

        setError(undefined);
        props.submit(
            { ...body, idempotencyKey: attempt.current.key },
            {
                onSuccess: () => {
                    attempt.current = null;
                    setSent(true);
                    setNote('');
                },
                onError: err => setError(getErrorMessage(err)),
            },
        );
    };

    return (
        <Page title={props.title} description={props.description}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
                <form onSubmit={submit} className="card card-border h-fit bg-base-100 shadow-sm">
                    <div className="card-body gap-3">
                        <h2 className="card-title">New request</h2>

                        <label className="form-control">
                            <span className="label-text mb-1">{targetLabel}</span>
                            <select className="select w-full" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                                <option value="">Select a {noun}</option>
                                {props.rows.map(row => (
                                    <option key={row.id} value={row.id}>
                                        {props.optionLabel(row)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="form-control">
                            <span className="label-text mb-1">Date</span>
                            <input type="date" className="input w-full" value={date} min={todayLocal()} onChange={e => setDate(e.target.value)} required />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="form-control">
                                <span className="label-text mb-1">From</span>
                                <input type="time" className="input w-full" value={from} onChange={e => setFrom(e.target.value)} required />
                            </label>
                            <label className="form-control">
                                <span className="label-text mb-1">To</span>
                                <input type="time" className="input w-full" value={to} onChange={e => setTo(e.target.value)} required />
                            </label>
                        </div>

                        <label className="form-control">
                            <span className="label-text mb-1">What is it for? (optional)</span>
                            <textarea
                                className="textarea w-full"
                                rows={2}
                                maxLength={300}
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder={props.notePlaceholder}
                            />
                        </label>

                        <p className="text-xs opacity-60">Up to {MAX_RESERVATION_HOURS} hours per reservation.</p>

                        {reserved && !error && (
                            <div role="alert" className="alert alert-error alert-soft">
                                That {noun} is already reserved for part of that time.
                            </div>
                        )}
                        {alsoRequested && !error && (
                            <div role="status" className="alert alert-warning alert-soft">
                                Someone has already asked for this {noun} at that time. A librarian will decide who gets it.
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="alert alert-error alert-soft">
                                {error}
                            </div>
                        )}
                        {sent && (
                            <div role="status" className="alert alert-success alert-soft">
                                Request sent. You will see it below once a librarian decides.
                            </div>
                        )}

                        <button className="btn btn-primary" disabled={props.submitting}>
                            {props.submitting ? 'Sending…' : `Request ${noun}`}
                        </button>
                    </div>
                </form>

                <div className="flex min-w-0 flex-col gap-6">
                    <AvailabilityGrid
                        rows={props.rows}
                        slots={slots}
                        isError={availability.isError}
                        emptyText={props.emptyText}
                        footnote={props.footnote}
                        date={date}
                        from={from}
                        to={to}
                        selectedId={targetId}
                        onSelect={setTargetId}
                    />

                    <MyReservations
                        id={`my-${noun.replace(/\s+/g, '-')}-reservations`}
                        heading={props.myHeading}
                        emptyText={props.myEmptyText}
                        items={props.mine}
                        isLoading={props.mineLoading}
                        onCancel={props.cancel}
                        cancelPending={props.cancelling}
                        cancelError={props.cancelError}
                        now={Date.now()}
                    />
                </div>
            </div>
        </Page>
    );
}
