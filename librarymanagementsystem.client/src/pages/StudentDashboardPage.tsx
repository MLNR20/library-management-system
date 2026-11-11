import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/useAuth.ts';
import { Page } from '../components/layout/Page.tsx';

const quickLinks = [
    { to: '/student/books', label: 'Find a book' },
    { to: '/student/map', label: 'Library map' },
    { to: '/student/tables', label: 'Reserve a table' },
    { to: '/student/rooms', label: 'Reserve a room' },
];

/** Current time and date, ticking every second. */
function LiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <section
            aria-label="Clock"
            className="flex h-full flex-col justify-center rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8"
        >
            <p className="text-sm font-medium uppercase tracking-wide opacity-60">
                {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <time dateTime={now.toISOString()} className="mt-1 font-mono text-5xl font-bold tabular-nums">
                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </time>
        </section>
    );
}

/** A reader's landing page: a welcome by name (7 of 12 columns) beside a live clock (5 of 12). */
export function StudentDashboardPage() {
    const { user } = useAuth();
    // Accounts made before names were collected have none; fall back to the user name.
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.userName;

    return (
        <Page title="Dashboard">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section
                    aria-label="Welcome"
                    className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8 lg:col-span-7"
                >
                    <p className="text-sm font-medium uppercase tracking-wide text-white/80">Welcome to Alexandria</p>
                    <h2 className="mt-1 text-3xl font-bold">{fullName}</h2>
                    <div className="mt-5 flex flex-wrap gap-2">
                        {quickLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="btn btn-sm rounded-full border-0 bg-white/20 text-white hover:bg-white/30"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </section>
                <div className="lg:col-span-5">
                    <LiveClock />
                </div>
            </div>
        </Page>
    );
}
