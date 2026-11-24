import type { ReactNode } from 'react';

interface CardProps {
    title: ReactNode;
    subtitle?: ReactNode;
    /** Image URL shown above the body. */
    image?: string;
    imageAlt?: string;
    /** Small labels shown next to the title (e.g. status, genre). */
    badges?: ReactNode;
    /** Buttons rendered bottom-right. */
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}

export function Card({
    title,
    subtitle,
    image,
    imageAlt = '',
    badges,
    actions,
    children,
    className = '',
}: CardProps) {
    return (
        <div className={`card card-border bg-base-100 ${className}`}>
            {image && (
                <figure>
                    <img src={image} alt={imageAlt} className="h-48 w-full object-cover" />
                </figure>
            )}
            <div className="card-body">
                <h3 className="card-title">
                    {title}
                    {badges}
                </h3>
                {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
                {children}
                {actions && <div className="card-actions mt-2 justify-end">{actions}</div>}
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon?: ReactNode;
    /** Colour of the icon's tile; the theme's primary colour unless set. */
    tone?: 'primary' | 'success' | 'warning' | 'error';
    className?: string;
}

// Whole class names, so Tailwind can see them.
const TONES = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
} as const;

export function StatCard({ label, value, hint, icon, tone = 'primary', className = '' }: StatCardProps) {
    return (
        <div className={`stats card-border border-base-content/15 bg-base-100 ${className}`}>
            {/* Tighter on phones, where two cards share a row; the text may wrap instead of running out of the card. */}
            <div className="stat flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                {icon && (
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-box sm:size-14 ${TONES[tone]}`}>
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="stat-title whitespace-normal">{label}</div>
                    <div className="stat-value text-2xl sm:text-3xl">{value}</div>
                    {hint && <div className="stat-desc whitespace-normal">{hint}</div>}
                </div>
            </div>
        </div>
    );
}

/** Placeholder with the shape of a StatCard, shown while its numbers load. */
export function StatCardSkeleton() {
    return (
        <div className="stats card-border border-base-300 bg-base-100" aria-hidden="true">
            <div className="stat flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                <div className="skeleton size-10 shrink-0 rounded-box sm:size-14" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="skeleton h-3 w-2/3" />
                    <div className="skeleton h-7 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                </div>
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="card card-border bg-base-100" aria-hidden="true">
            <div className="card-body gap-3">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-16 w-full" />
            </div>
        </div>
    );
}

/** Responsive grid for cards: 1 column on phones, up to 3 on desktop. */
export function CardGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>{children}</div>;
}
