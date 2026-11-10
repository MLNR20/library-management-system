import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/useAuth.ts';
import { useLatestAnnouncements } from '../api/publicAnnouncements.ts';
import { useLatestNews, usePublicFaqs } from '../api/publicNews.ts';
import { SiteFooter } from '../components/layout/SiteFooter.tsx';
import { SiteNavbar } from '../components/layout/SiteNavbar.tsx';
import { FaqList } from '../components/news/FaqList.tsx';
import { NewsGrid } from '../components/news/NewsGrid.tsx';
import { RichText } from '../components/ui/RichText.tsx';
import {
    AnnouncementIcon,
    BookIcon,
    ClockIcon,
    LoanIcon,
    MapIcon,
    NewsIcon,
    QuestionIcon,
    ShieldIcon,
} from '../components/ui/icons.tsx';

/** A 3x3 grid. One more than this is fetched so the page knows whether to offer "View more". */
const NEWS_ON_LANDING = 9;

interface Feature {
    icon: ReactNode;
    title: string;
    text: string;
}

const features: Feature[] = [
    {
        icon: <BookIcon className="h-7 w-7" />,
        title: 'Search the catalogue',
        text: 'Look up books by title, author or genre and see at a glance which copies are on the shelf.',
    },
    {
        icon: <MapIcon className="h-7 w-7" />,
        title: 'Find it on the map',
        text: 'Pick a book and follow the highlighted route through our 3D floor plan straight to its shelf.',
    },
    {
        icon: <LoanIcon className="h-7 w-7" />,
        title: 'Borrow and return',
        text: 'Check books out, keep track of due dates and see any overdue penalties before they surprise you.',
    },
    {
        icon: <AnnouncementIcon className="h-7 w-7" />,
        title: 'Stay in the loop',
        text: 'New arrivals, events and closures are posted as announcements the moment the librarians publish them.',
    },
    {
        icon: <ClockIcon className="h-7 w-7" />,
        title: 'Librarian time cards',
        text: 'Staff clock in and out with one click, and every shift is recorded for administrators to review.',
    },
    {
        icon: <ShieldIcon className="h-7 w-7" />,
        title: 'Roles and audit trail',
        text: 'Readers, librarians and administrators each see only what they need, and every change is logged.',
    },
];

const steps = [
    { title: 'Create an account', text: 'Register with a user name and password. It only takes a moment.' },
    { title: 'Find your book', text: 'Search the catalogue and filter by genre or availability.' },
    { title: 'Follow the route', text: 'Open the map, walk the highlighted path and pick it up from the shelf.' },
];

/** Public front door: what the library offers and where to sign in or sign up. */
export function LandingPage() {
    const { user, isStaff } = useAuth();
    const announcements = useLatestAnnouncements().data ?? [];
    const news = useLatestNews(NEWS_ON_LANDING + 1).data ?? [];
    const faqs = usePublicFaqs().data ?? [];
    const home = isStaff ? '/' : '/student';

    return (
        <div className="flex min-h-screen flex-col bg-base-100">
            <SiteNavbar />

            <main className="flex-1">
                {/* The photo is public/hero-reading-room.webp (see .hero-photo in index.css). */}
                <section className="hero-photo relative isolate text-white">
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/20" aria-hidden="true" />
                    <div className="flex min-h-[28rem] items-center px-6 py-20 md:min-h-[34rem] md:px-44 md:py-28">
                        <div className="max-w-2xl">
                            <span className="badge mb-4 border-white/30 bg-white/15 text-white">Welcome to Alexandria</span>
                            <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
                                Every book,
                                <br />
                                right where you need it.
                            </h1>
                            <p className="mt-4 max-w-prose text-lg text-white/85">
                                Search our collection, see what is available today and let the interactive map walk
                                you to the exact shelf. No more wandering the aisles.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                {user ? (
                                    <Link to={home} className="btn btn-primary btn-lg">
                                        Open the library
                                    </Link>
                                ) : (
                                    <>
                                        <Link to="/register" className="btn btn-primary btn-lg">
                                            Get started
                                        </Link>
                                        <Link to="/login" className="btn btn-lg border-white/60 bg-transparent text-white hover:bg-white/15">
                                            Sign in
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {announcements.length > 0 && (
                    <section id="announcements" className="border-b border-base-300 bg-base-200" aria-labelledby="announcements-heading">
                        <div className="mx-auto max-w-6xl px-4 py-12">
                            <h2 id="announcements-heading" className="flex items-center justify-center gap-2 text-2xl font-bold">
                                <AnnouncementIcon className="h-6 w-6 text-primary" />
                                Announcements
                            </h2>
                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                {announcements.map(announcement => (
                                    <article key={announcement.id} className="card card-border bg-base-100 shadow-sm md:first:col-span-1">
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
                        </div>
                    </section>
                )}

                {news.length > 0 && (
                    <section id="news" className="scroll-mt-16 border-b border-base-300" aria-labelledby="news-heading">
                        <div className="mx-auto max-w-6xl px-4 py-12">
                            <h2 id="news-heading" className="flex items-center justify-center gap-2 text-2xl font-bold">
                                <NewsIcon className="h-6 w-6 text-primary" />
                                News
                            </h2>
                            <div className="mt-6">
                                <NewsGrid posts={news.slice(0, NEWS_ON_LANDING)} />
                            </div>
                            {/* The ninth article fills the 3x3 grid; anything beyond it is on the News page. */}
                            {news.length > NEWS_ON_LANDING && (
                                <div className="mt-8 flex justify-center">
                                    <Link to="/welcome/news" className="btn btn-outline btn-primary">
                                        View more
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {faqs.length > 0 && (
                    <section id="faqs" className="scroll-mt-16 bg-base-200" aria-labelledby="faqs-heading">
                        <div className="mx-auto max-w-6xl px-4 py-12">
                            <h2 id="faqs-heading" className="flex items-center justify-center gap-2 text-2xl font-bold">
                                <QuestionIcon className="h-6 w-6 text-primary" />
                                Frequently asked questions
                            </h2>
                            <div className="mt-6">
                                <FaqList faqs={faqs} />
                            </div>
                        </div>
                    </section>
                )}

                <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16" aria-labelledby="features-heading">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 id="features-heading" className="text-3xl font-bold">
                            Everything a library needs
                        </h2>
                        <p className="mt-2 opacity-70">
                            One place for readers to find and borrow, and for staff to run the building.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map(feature => (
                            <div key={feature.title} className="card card-border bg-base-100 shadow-sm">
                                <div className="card-body gap-3">
                                    <div className="flex size-12 items-center justify-center rounded-box bg-primary/10 text-primary">
                                        {feature.icon}
                                    </div>
                                    <h3 className="card-title">{feature.title}</h3>
                                    <p className="text-sm opacity-75">{feature.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="how-it-works" className="scroll-mt-16 bg-base-200" aria-labelledby="steps-heading">
                    <div className="mx-auto max-w-6xl px-4 py-16">
                        <h2 id="steps-heading" className="text-center text-3xl font-bold">
                            From search to shelf in three steps
                        </h2>
                        <ol className="mt-10 grid gap-6 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li key={step.title} className="flex gap-4">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-content">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h3 className="font-bold">{step.title}</h3>
                                        <p className="mt-1 text-sm opacity-75">{step.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {!user && (
                    <section className="mx-auto max-w-6xl px-4 py-16">
                        <div className="card bg-primary text-primary-content">
                            <div className="card-body items-center gap-4 py-12 text-center">
                                <h2 className="text-3xl font-bold">Ready to find your next read?</h2>
                                <p className="max-w-prose opacity-90">
                                    Create a free account and start browsing the collection today.
                                </p>
                                <div className="card-actions">
                                    <Link to="/register" className="btn btn-lg border-0 bg-base-100 text-base-content">
                                        Create account
                                    </Link>
                                    <Link to="/login" className="btn btn-lg btn-ghost">
                                        I already have one
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <SiteFooter />
        </div>
    );
}
