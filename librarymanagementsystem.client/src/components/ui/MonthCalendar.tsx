import { useEffect, useState } from 'react';

const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
);

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** A month at a glance with today marked, the time ticking above it, and arrows to look at other months. */
export function MonthCalendar() {
    const [now, setNow] = useState(() => new Date());
    const [shown, setShown] = useState(() => startOfMonth(new Date()));

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
    const leadingBlanks = shown.getDay();
    const cells: (number | null)[] = [
        ...Array.from({ length: leadingBlanks }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const isCurrentMonth = sameDay(shown, startOfMonth(now));

    function moveMonth(by: number) {
        setShown(current => new Date(current.getFullYear(), current.getMonth() + by, 1));
    }

    return (
        <section aria-label="Calendar" className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">
                    {shown.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h2>
                <time dateTime={now.toISOString()} className="font-mono text-sm tabular-nums opacity-70">
                    {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </time>
            </div>

            <div className="mt-3 flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-sm btn-circle text-xl" aria-label="Previous month" onClick={() => moveMonth(-1)}>
                    ‹
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-circle text-xl" aria-label="Next month" onClick={() => moveMonth(1)}>
                    ›
                </button>
                {!isCurrentMonth && (
                    <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setShown(startOfMonth(now))}>
                        Today
                    </button>
                )}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm">
                {weekdays.map(day => (
                    <span key={day} className="py-1 text-xs font-medium uppercase opacity-60">
                        {day}
                    </span>
                ))}
                {cells.map((day, index) => {
                    if (day === null) {
                        return <span key={`blank-${index}`} />;
                    }

                    const isToday = sameDay(new Date(shown.getFullYear(), shown.getMonth(), day), now);

                    return (
                        <span
                            key={day}
                            aria-current={isToday ? 'date' : undefined}
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${
                                isToday ? 'bg-purple-600 font-bold text-white' : ''
                            }`}
                        >
                            {day}
                        </span>
                    );
                })}
            </div>
        </section>
    );
}
