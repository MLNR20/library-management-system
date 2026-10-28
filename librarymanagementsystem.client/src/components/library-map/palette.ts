import { BookStatus } from '../../api/resources.ts';
import { hash01 } from '../../lib/libraryLayout.ts';

export const statusColors: Record<BookStatus, string> = {
    [BookStatus.Available]: '#34d399',
    [BookStatus.Borrowed]: '#fbbf24',
    [BookStatus.Reserved]: '#60a5fa',
    [BookStatus.Lost]: '#f87171',
    [BookStatus.Damaged]: '#9ca3af',
};

/** Each section gets its own colour, used for the plate under its shelf and for the legend. */
export function sectionColor(sectionId: string): string {
    return `hsl(${Math.round(hash01(sectionId) * 360)}, 70%, 55%)`;
}
