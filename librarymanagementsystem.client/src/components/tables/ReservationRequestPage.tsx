import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Page } from '../layout/Page.tsx';
import { CellCalendar, dayKey } from '../ui/CellCalendar.tsx';
import { Modal } from '../ui/Modal.tsx';
import { findOverlap, MAX_RESERVATION_HOURS, ReservationStatus } from '../../api/tables.ts';
import { getErrorMessage } from '../../lib/api.ts';
import { AvailabilityGrid } from './AvailabilityGrid.tsx';
import type { AvailabilityRow, AvailabilitySlot } from './AvailabilityGrid.tsx';
import { MyReservations } from './MyReservations.tsx';
import type { ReservationItem } from './ReservationCard.tsx';

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

/**
 * Students file a request for a table or a room; it only holds it once a librarian approves it. A calendar picks the
 * day, the grid shows what is taken that day, and the request form opens in a modal.
 */
export function ReservationRequestPage(props: Props) {
    const { noun, targetLabel } = props;

    const [targetId, setTargetId] = useState('');
    const [date, setDate] = useState(todayLocal());
    const [from, setFrom] = useState('14:00');
    const [to, setTo] = useState('16:00');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string>();
    const [sent, setSent] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [tab, setTab] = useState<'request' | 'mine'>('request');
    const attempt = useRef<{ signature: string; key: string } | null>(null);

    const availability = props.useAvailability(date);
    const slots = availability.data ?? [];
    const ofTarget = slots.filter(slot => slot.rowId === targetId);
    const reserved = targetId ? findOverlap(ofTarget, ReservationStatus.Approved, date, from, to) : undefined;
    const alsoRequested = targetId && !reserved ? findOverlap(ofTarget, ReservationStatus.Pending, date, from, to) : undefined;

    // How many of the student's own live reservations start on each day, by status, for the calendar cells.
    const mineByDay = new Map<string, { approved: number; pending: number }>();
    for (const item of props.mine) {
        if (item.status !== ReservationStatus.Pending && item.status !== ReservationStatus.Approved) continue;
        const key = dayKey(new Date(item.startUtc));
        const counts = mineByDay.get(key) ?? { approved: 0, pending: 0 };
        if (item.status === ReservationStatus.Approved) counts.approved += 1;
        else counts.pending += 1;
        mineByDay.set(key, counts);
    }

    const openForm = () => {
        setError(undefined);
        setSent(false);
        setFormOpen(true);
    };

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
                    setFormOpen(false);
                },
                onError: err => setError(getErrorMessage(err)),
            },
        );
    };

    return (
        <Page title={props.title} description={props.description}>
            <div role="tablist" className="tabs tabs-border mb-6 border-b border-base-300" aria-label={props.title}>
                <button role="tab" aria-selected={tab === 'request'} className={`tab ${tab === 'request' ? 'tab-active' : ''}`} onClick={() => setTab('request')}>
                    {props.title}
                </button>
                <button role="tab" aria-selected={tab === 'mine'} className={`tab ${tab === 'mine' ? 'tab-active' : ''}`} onClick={() => setTab('mine')}>
                    {props.myHeading}
                    {props.mine.length > 0 && <span className="badge badge-sm ml-2">{props.mine.length}</span>}
                </button>
            </div>

            {tab === 'mine' ? (
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
            ) : (
                <div className="flex flex-col gap-4">
                    {sent && (
                        <div role="status" className="alert alert-success alert-soft">
                            Request sent. Follow it under {props.myHeading} while a librarian decides.
                        </div>
                    )}
                    <div>
                        <CellCalendar
                            value={date}
                            min={todayLocal()}
                            onSelect={setDate}
                            renderDay={key => {
                                const counts = mineByDay.get(key);
                                if (!counts) return null;
                                // Green is approved, amber is still waiting for a librarian; the same colours as the grid and the badges.
                                return (
                                    <>
                                        {counts.approved > 0 && <span className="badge badge-success badge-sm">{counts.approved} approved</span>}
                                        {counts.pending > 0 && <span className="badge badge-warning badge-sm">{counts.pending} waiting</span>}
                                    </>
                                );
                            }}
                            actions={
                                <button type="button" className="btn btn-primary btn-sm" onClick={openForm}>
                                    New request
                                </button>
                            }
                            legend={
                                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-label="Legend">
                                    <li className="flex items-center gap-1.5">
                                        <span className="badge badge-success badge-xs" /> Approved
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="badge badge-warning badge-xs" /> Waiting for approval
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="inline-block size-3.5 rounded-full bg-purple-600" /> Today
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="inline-block size-3.5 border-2 border-purple-600" /> Chosen day
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="inline-block size-3.5 border border-base-content/40 bg-base-content/10" /> Past day (can't be chosen)
                                    </li>
                                </ul>
                            }
                        />
                    </div>
                </div>
            )}

            <Modal open={formOpen} title="New request" onClose={() => setFormOpen(false)} className="max-w-5xl">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
                <form onSubmit={submit} className="flex flex-col gap-3">
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

                    <div className="modal-action mt-1">
                        <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" disabled={props.submitting}>
                            {props.submitting ? 'Sending…' : `Request ${noun}`}
                        </button>
                    </div>
                </form>

                <div className="min-w-0">
                    <p className="mb-2 text-sm opacity-70">
                        Availability on{' '}
                        <span className="font-semibold opacity-100">
                            {new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </p>
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
                </div>
                </div>
            </Modal>
        </Page>
    );
}
