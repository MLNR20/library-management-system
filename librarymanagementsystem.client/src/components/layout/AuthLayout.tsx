import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PhotoCredit } from './PhotoCredit.tsx';
import { useLightTheme } from './useLightTheme.ts';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Link to a related auth page. */
    footer: ReactNode;
}

/** Frame shared by the sign-in, registration and password pages: the reading-room photo on one half and the form on the other. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
    // These pages are always light. They have no navbar to see to that.
    useLightTheme();

    return (
        <main className="grid min-h-screen bg-base-100 lg:grid-cols-2">
            {/* The same photo as the landing page hero. Decorative, and left out where there is no room for two halves. */}
            {/* It stays in view while a long form, such as sign-up, scrolls past it. */}
            <div className="hero-photo relative hidden lg:sticky lg:top-0 lg:block lg:h-screen">
                <PhotoCredit />
            </div>
            <div className="flex items-center justify-center px-4 py-10">
                <div className="flex w-full max-w-sm flex-col gap-4">
                    <Link to="/welcome" aria-label="Alexandria" className="self-center rounded-box bg-primary p-4 text-white">
                        <span className="block size-[1em] text-center font-brand text-3xl leading-none font-bold">A</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="mt-[0.1rem] text-[1.2rem] opacity-70">{subtitle}</p>
                    </div>
                    {children}
                    <p className="text-center text-sm">{footer}</p>
                </div>
            </div>
        </main>
    );
}
