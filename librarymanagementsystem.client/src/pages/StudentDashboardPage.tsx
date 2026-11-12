import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useLatestAnnouncements } from '../api/publicAnnouncements.ts';
import { usePublicFaqs } from '../api/publicNews.ts';
import { useAuth } from '../auth/useAuth.ts';
import { Page } from '../components/layout/Page.tsx';
import { FaqList } from '../components/news/FaqList.tsx';
import { RichText } from '../components/ui/RichText.tsx';

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

const valueParagraphs = [
    'Alexandria brings the whole library to your fingertips, so you can see what is on the shelves before you leave your desk. Searching by title, author or genre takes seconds, and every result shows whether the book is available right now. The interactive map then walks you to the exact shelf, which means no more wandering the aisles or waiting for help. That saves time that is better spent reading, revising or simply enjoying a good book. For a student with a full timetable, every minute handed back is a real gain.',
    'Alexandria also makes the building itself easier to use, with reading-room tables and whole rooms that you can reserve ahead of time. Your reservations and the decisions made on them are kept in one place, so nobody has to guess whether a seat will be waiting. Announcements, news and answers to common questions keep you informed about new arrivals, events and closures as soon as they are posted. Behind the scenes, librarians manage the catalogue, the loans and their shifts with the same system, which keeps everything accurate and up to date. Together these pieces turn a collection of shelves into a welcoming, dependable place to learn.',
];

/** A reader's landing page: a welcome by name (7 of 12 columns) beside a live clock (5 of 12). */
export function StudentDashboardPage() {
    const { user } = useAuth();
    const announcements = useLatestAnnouncements().data ?? [];
    const faqs = usePublicFaqs().data ?? [];
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

            {announcements.length > 0 && (
                <section aria-labelledby="announcements-heading" className="flex flex-col gap-3">
                    <h2 id="announcements-heading" className="text-xl font-bold">
                        Announcements
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {announcements.map(announcement => (
                            <article key={announcement.id} className="card card-border bg-base-100 shadow-sm">
                                <div className="card-body gap-2">
                                    <time className="text-xs opacity-70" dateTime={announcement.createdAt}>
                                        {new Date(announcement.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                    </time>
                                    <h3 className="card-title">{announcement.title}</h3>
                                    <RichText html={announcement.body} className="text-sm opacity-80" />
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {faqs.length > 0 && (
                <section aria-labelledby="faqs-heading" className="flex flex-col gap-3">
                    <h2 id="faqs-heading" className="text-xl font-bold">
                        Frequently asked questions
                    </h2>
                    <FaqList faqs={faqs} />
                </section>
            )}

            <section aria-labelledby="value-heading" className="flex flex-col gap-3">
                <h2 id="value-heading" className="text-xl font-bold">
                    The value of Alexandria
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                    {valueParagraphs.map(paragraph => (
                        <p key={paragraph.slice(0, 24)} className="leading-relaxed opacity-80">
                            {paragraph}
                        </p>
                    ))}
                </div>
            </section>
        </Page>
    );
}
