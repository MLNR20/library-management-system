import type { ReactNode } from 'react';
import { SiteNavbar } from './SiteNavbar.tsx';
import { useLightTheme } from './useLightTheme.ts';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Link to a related auth page. */
    footer: ReactNode;
    /** Full screen with no navbar: the reading-room photo on one half and the form on the other. */
    split?: boolean;
}

/** Frame shared by the sign-in, registration and password pages. */
export function AuthLayout({ title, subtitle, children, footer, split = false }: AuthLayoutProps) {
    const content = (
        <>
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="opacity-70">{subtitle}</p>
            </div>
            {children}
            <p className="text-center text-sm">{footer}</p>
        </>
    );

    if (split) {
        return <SplitFrame>{content}</SplitFrame>;
    }

    return (
        <div className="flex min-h-screen flex-col bg-base-200">
            <SiteNavbar />
            <main className="flex flex-1 items-center justify-center p-4">
                <div className="card w-full max-w-md bg-base-100 shadow-md">
                    <div className="card-body gap-4">{content}</div>
                </div>
            </main>
        </div>
    );
}

function SplitFrame({ children }: { children: ReactNode }) {
    // These pages are always light. The navbar normally sees to that, and there is none here.
    useLightTheme();

    return (
        <main className="grid min-h-screen bg-base-100 lg:grid-cols-2">
            {/* The same photo as the landing page hero. Decorative, and left out where there is no room for two halves. */}
            <div className="hero-photo hidden lg:block" aria-hidden="true" />
            <div className="flex items-center justify-center px-4 py-10">
                <div className="flex w-full max-w-sm flex-col gap-4">{children}</div>
            </div>
        </main>
    );
}
