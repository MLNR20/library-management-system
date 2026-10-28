import type { ReactNode } from 'react';

interface AuthLayoutProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Link to the other auth page. */
    footer: ReactNode;
}

/** Centered card shared by the login and register pages. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-md">
                <div className="card-body gap-4">
                    <div>
                        <div className="text-3xl">📚</div>
                        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
                        <p className="opacity-70">{subtitle}</p>
                    </div>
                    {children}
                    <p className="text-center text-sm">{footer}</p>
                </div>
            </div>
        </div>
    );
}
