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
        <div className={`card card-border bg-base-100 shadow-sm ${className}`}>
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
    className?: string;
}

export function StatCard({ label, value, hint, icon, className = '' }: StatCardProps) {
    return (
        <div className={`stats card-border border-base-300 bg-base-100 shadow-sm ${className}`}>
            <div className="stat flex items-center gap-4">
                {icon && (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary">
                        {icon}
                    </div>
                )}
                <div>
                    <div className="stat-title">{label}</div>
                    <div className="stat-value">{value}</div>
                    {hint && <div className="stat-desc">{hint}</div>}
                </div>
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="card card-border bg-base-100 shadow-sm" aria-hidden="true">
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
