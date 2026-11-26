import type { ReactNode } from 'react';
import { SiteNavbar } from './SiteNavbar.tsx';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Link to a related auth page. */
    footer: ReactNode;
    /** On wide screens, the reading-room photo on one half and the form on the other, instead of a centered card. */
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

    return (
        <div className={`flex min-h-screen flex-col ${split ? 'bg-base-100' : 'bg-base-200'}`}>
            <SiteNavbar />
            {split ? (
                <main className="grid flex-1 lg:grid-cols-2">
                    {/* The same photo as the landing page hero. Decorative, and left out where there is no room for two halves. */}
                    <div className="hero-photo hidden lg:block" aria-hidden="true" />
                    <div className="flex items-center justify-center px-4 py-10">
                        <div className="flex w-full max-w-sm flex-col gap-4">{content}</div>
                    </div>
                </main>
            ) : (
                <main className="flex flex-1 items-center justify-center p-4">
                    <div className="card w-full max-w-md bg-base-100 shadow-md">
                        <div className="card-body gap-4">{content}</div>
                    </div>
                </main>
            )}
        </div>
    );
}
