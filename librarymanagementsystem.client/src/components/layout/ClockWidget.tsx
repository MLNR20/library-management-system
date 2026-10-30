import { useEffect, useState } from 'react';
import { useClockIn, useClockOut, useClockState } from '../../api/clock.ts';
import { getErrorMessage } from '../../lib/api.ts';

function formatDuration(totalMinutes: number) {
    return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
}

/** The API returns UTC instants, but ones read back from the database can arrive without a "Z". */
function parseUtc(value: string) {
    return Date.parse(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
}

/** Clock in / clock out for the signed-in user, with today's running total. Lives in the app header. */
export function ClockWidget() {
    const { data: state, isError } = useClockState();
    const clockIn = useClockIn();
    const clockOut = useClockOut();
    const [now, setNow] = useState(() => Date.now());

    // Tick once a minute while clocked in so the total keeps up without refetching.
    const clockedInAt = state?.clockedInAtUtc ?? null;
    useEffect(() => {
        if (!clockedInAt) return;
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, [clockedInAt]);

    if (isError) return null;
    if (!state) return <span className="loading loading-spinner loading-xs" aria-label="Loading clock" />;

    const openMinutes = clockedInAt ? Math.max(0, Math.floor((now - parseUtc(clockedInAt)) / 60_000)) : 0;
    const todayMinutes = state.todayHours * 60 + state.todayMinutes + openMinutes;
    const mutation = state.isClockedIn ? clockOut : clockIn;
    const error = clockIn.error ?? clockOut.error;

    return (
        <div className="flex items-center gap-2 pr-2">
            <div className="hidden text-right text-xs leading-tight md:block" aria-live="polite">
                <div className="flex items-center justify-end gap-1 font-medium">
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${state.isClockedIn ? 'bg-success' : 'bg-base-content/30'}`}
                        aria-hidden="true"
                    />
                    {state.isClockedIn
                        ? `Clocked in since ${new Date(parseUtc(clockedInAt!)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : 'Clocked out'}
                </div>
                <div className="text-base-content/60">Today: {formatDuration(todayMinutes)}</div>
            </div>
            <button
                type="button"
                className={`btn btn-sm ${state.isClockedIn ? 'btn-outline btn-error' : 'btn-success'}`}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                title={error ? getErrorMessage(error) : undefined}
            >
                {mutation.isPending && <span className="loading loading-spinner loading-xs" />}
                {state.isClockedIn ? 'Clock out' : 'Clock in'}
            </button>
            {error && (
                <span role="alert" className="sr-only">
                    {getErrorMessage(error)}
                </span>
            )}
        </div>
    );
}
