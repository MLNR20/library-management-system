import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/useAuth.ts';
import { useDarkTheme } from '../components/layout/useDarkTheme.ts';
import { AnnouncementIcon, BookIcon, ClockIcon, LoanIcon, MapIcon, ShieldIcon } from '../components/ui/icons.tsx';

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
    const { user, isStaff, logout } = useAuth();
    const [dark, setDark] = useDarkTheme();
    const home = isStaff ? '/' : '/student';

    return (
        <div className="flex min-h-screen flex-col bg-base-100">
            <header className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100/90 backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-2">
                    <Link to="/welcome" className="flex-1 text-xl font-bold whitespace-nowrap">
                        📚 Library
                    </Link>
                    <label className="flex cursor-pointer items-center gap-2 pr-2 text-sm">
                        <span className="hidden sm:inline">Dark</span>
                        <input
                            type="checkbox"
                            className="toggle"
                            checked={dark}
                            onChange={event => setDark(event.target.checked)}
                            aria-label="Dark theme"
                        />
                    </label>
                    {user ? (
                        <>
                            <span className="hidden text-sm sm:inline">{user.userName}</span>
                            <button className="btn btn-ghost btn-sm" onClick={logout}>
                                Sign out
                            </button>
                            <Link to={home} className="btn btn-primary btn-sm">
                                Open library
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost btn-sm">
                                Sign in
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Create account
                            </Link>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1">
                <section className="bg-gradient-to-b from-primary/10 to-transparent">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
                        <div>
                            <span className="badge badge-primary badge-soft mb-4">Welcome to the library</span>
                            <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
                                Every book,
                                <br />
                                right where you need it.
                            </h1>
                            <p className="mt-4 max-w-prose text-lg opacity-75">
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
                                        <Link to="/login" className="btn btn-outline btn-lg">
                                            Sign in
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <ShelfIllustration />
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-heading">
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

                <section className="bg-base-200" aria-labelledby="steps-heading">
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

            <footer className="footer footer-center border-t border-base-300 p-6 text-sm opacity-70">
                <p>📚 Library Management System</p>
            </footer>
        </div>
    );
}

// Decorative bookshelf: a few rows of spines in the theme's own colours.
const shelves = [
    ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-primary/60', 'bg-neutral', 'bg-secondary/70', 'bg-accent/70'],
    ['bg-accent/80', 'bg-primary', 'bg-neutral', 'bg-secondary', 'bg-primary/70', 'bg-accent', 'bg-secondary/60'],
    ['bg-secondary', 'bg-neutral', 'bg-primary/80', 'bg-accent', 'bg-secondary/80', 'bg-primary', 'bg-neutral'],
];
const spineHeights = ['h-20', 'h-24', 'h-16', 'h-24', 'h-20', 'h-16', 'h-24'];

function ShelfIllustration() {
    return (
        <div
            className="mx-auto w-full max-w-md rounded-box border border-base-300 bg-base-200 p-5 shadow-md"
            aria-hidden="true"
        >
            {shelves.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-end gap-1.5 border-b-8 border-base-content/30 px-2 pt-4">
                    {row.map((color, index) => (
                        <div
                            key={index}
                            className={`w-full max-w-9 flex-1 rounded-t-sm ${color} ${spineHeights[(index + rowIndex) % spineHeights.length]}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
