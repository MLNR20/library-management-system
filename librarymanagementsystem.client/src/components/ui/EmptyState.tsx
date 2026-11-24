import type { ReactNode } from 'react';

type Illustration = 'books' | 'history';

interface EmptyStateProps {
    illustration?: Illustration;
    /** An image file (an imported SVG, say) shown in place of the drawn illustration. */
    image?: string;
    title: string;
    children?: ReactNode;
    className?: string;
}

// Original line illustrations drawn with the theme's colours, so they follow light and dark mode. Decorative, so hidden from
// screen readers; the title says what they show.
function Books() {
    return (
        <>
            <ellipse cx="100" cy="124" rx="72" ry="7" className="fill-base-content/10" />
            <rect x="46" y="98" width="108" height="22" rx="4" className="fill-primary/20 stroke-primary" strokeWidth="2" />
            <path d="M60 98v22M140 98v22" className="stroke-primary" strokeWidth="2" />
            <rect x="58" y="74" width="88" height="22" rx="4" className="fill-secondary/20 stroke-secondary" strokeWidth="2" />
            <path d="M72 74v22M132 74v22" className="stroke-secondary" strokeWidth="2" />
            <rect x="68" y="52" width="70" height="20" rx="4" className="fill-accent/20 stroke-accent" strokeWidth="2" />
            <path d="M80 52v20" className="stroke-accent" strokeWidth="2" />
            <path d="M150 40v10M145 45h10M44 62v8M40 66h8" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
        </>
    );
}

function History() {
    return (
        <>
            <ellipse cx="100" cy="124" rx="72" ry="7" className="fill-base-content/10" />
            <rect x="52" y="104" width="96" height="16" rx="4" className="fill-secondary/20 stroke-secondary" strokeWidth="2" />
            <path d="M66 104v16" className="stroke-secondary" strokeWidth="2" />
            <circle cx="100" cy="58" r="38" className="fill-primary/10 stroke-primary" strokeWidth="2" />
            <path d="M100 36v22l15 9" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M100 24v4M100 88v4M66 58h4M130 58h4" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
            <path d="M158 38v10M153 43h10" className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
        </>
    );
}

/** A friendly "nothing here" block for an empty list: an illustration, a short title and an optional hint. */
export function EmptyState({ illustration = 'books', image, title, children, className = '' }: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center gap-2 px-4 py-10 text-center ${className}`}>
            {image ? (
                <img src={image} alt="" className="mb-2 h-auto w-full max-w-sm" />
            ) : (
                <svg viewBox="0 0 200 140" className="mb-2 h-36 w-auto" fill="none" aria-hidden="true">
                    {illustration === 'history' ? <History /> : <Books />}
                </svg>
            )}
            {/* 0.2rem bigger than the usual text-base (1rem) and text-sm (0.875rem). */}
            <p className="text-[1.2rem] font-semibold">{title}</p>
            {children && <p className="max-w-md text-[1.075rem] opacity-70">{children}</p>}
        </div>
    );
}
