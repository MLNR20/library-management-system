import type { ComponentType } from 'react';
import { Link } from 'react-router';
import { useLatestAnnouncements } from '../api/publicAnnouncements.ts';
import { useAuth } from '../auth/useAuth.ts';
import { Page } from '../components/layout/Page.tsx';
import { BookIcon, FloorIcon, MapIcon, TableIcon } from '../components/ui/icons.tsx';
import { MonthCalendar } from '../components/ui/MonthCalendar.tsx';
import { RichText } from '../components/ui/RichText.tsx';

const services: { to: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
    { to: '/student/books', label: 'Find a book', Icon: BookIcon },
    { to: '/student/map', label: 'Library map', Icon: MapIcon },
    { to: '/student/tables', label: 'Reserve a table', Icon: TableIcon },
    { to: '/student/rooms', label: 'Reserve a room', Icon: FloorIcon },
];

/**
 * A reader's landing page. Left (7 of 12 columns): a tall welcome card by name, with the services as icon tiles in their
 * own panel right under it. Right (5 of 12): a calendar with the latest announcements underneath.
 */
export function StudentDashboardPage() {
    const { user } = useAuth();
    const announcements = useLatestAnnouncements().data ?? [];
    // Accounts made before names were collected have none; fall back to the user name.
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.userName;

    return (
        <Page title="Dashboard">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="flex flex-col gap-6 lg:col-span-7">
                    <section
                        aria-label="Welcome"
                        className="flex min-h-[20rem] flex-col items-start rounded-3xl bg-purple-600 p-6 text-left text-white shadow-lg sm:p-8"
                    >
                        <div className="flex flex-1 flex-col items-start justify-center">
                            {/* Each size is the Tailwind step (text-sm 0.875rem, text-3xl 1.875rem) plus 0.2rem. */}
                            <p className="text-[1.075rem] font-medium uppercase leading-snug tracking-wide text-white/80">Welcome to Alexandria</p>
                            <h2 className="mt-1 text-[2.075rem] font-bold leading-tight">{fullName}</h2>
                        </div>
                        <p className="text-sm text-white/80">
                            Search the catalogue, find your book on the map, and reserve a table or a room.
                        </p>
                    </section>

                    <nav
                        aria-labelledby="services-heading"
                        className="flex flex-col gap-3 rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-6"
                    >
                        <h2 id="services-heading" className="text-xl font-bold">
                            Services
                        </h2>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {services.map(({ to, label, Icon }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className="flex flex-col items-center gap-3 rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:bg-base-200"
                                >
                                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-600 text-white">
                                        <Icon className="h-7 w-7" />
                                    </span>
                                    <span className="text-sm font-semibold">{label}</span>
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>

                <div className="flex flex-col gap-6 lg:col-span-5">
                    <MonthCalendar />

                    {announcements.length > 0 && (
                        <section
                            aria-labelledby="announcements-heading"
                            className="flex flex-col gap-3 rounded-3xl border border-base-300 bg-base-100 p-4 shadow-sm sm:p-6"
                        >
                            <h2 id="announcements-heading" className="text-xl font-bold">
                                Announcements
                            </h2>
                            {announcements.map(announcement => (
                                <article key={announcement.id} className="card bg-base-200">
                                    <div className="card-body gap-2">
                                        <time className="text-xs opacity-70" dateTime={announcement.createdAt}>
                                            {new Date(announcement.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </time>
                                        <h3 className="card-title">{announcement.title}</h3>
                                        <RichText html={announcement.body} className="text-sm opacity-80" />
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </Page>
    );
}
