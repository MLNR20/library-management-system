import type { ReactNode } from 'react';

interface PageProps {
    title: string;
    description?: string;
    /** Buttons shown on the right of the header. */
    actions?: ReactNode;
    children: ReactNode;
}

/** Content wrapper for every routed page: fills the space under the navbar (flex-1). */
export function Page({ title, description, actions, children }: PageProps) {
    return (
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-3">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    {description && <p className="text-[1.02rem] opacity-70">{description}</p>}
                </div>
                {actions}
            </header>
            <div className="flex flex-1 flex-col">{children}</div>
        </div>
    );
}
