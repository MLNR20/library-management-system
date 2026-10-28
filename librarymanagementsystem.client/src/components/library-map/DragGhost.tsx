import { useEffect, useState } from 'react';
import { useLibraryDrag } from './useLibraryDrag.ts';

/** The label that follows the pointer while a book is being dragged, saying what dropping would do. */
export function DragGhost({ rowLabels }: { rowLabels: Map<string, string> }) {
    const { drag, hoverRowId } = useLibraryDrag();
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const active = !!drag?.active;

    useEffect(() => {
        if (!active) return;
        const onMove = (event: PointerEvent) => setPosition({ x: event.clientX, y: event.clientY });
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, [active]);

    if (!drag?.active) return null;

    const at = position ?? { x: drag.x, y: drag.y };
    const target = hoverRowId ? rowLabels.get(hoverRowId) : undefined;
    const hint = target
        ? drag.fromRowId
            ? `Move to ${target}`
            : `Shelve in ${target}`
        : drag.fromRowId
          ? 'Drop on a row, or on the book list to take it off the shelf'
          : 'Drop on a row of a shelf';

    return (
        <div
            className="pointer-events-none fixed z-50 max-w-72 rounded-box border border-primary bg-base-100 px-3 py-2 shadow-lg"
            style={{ left: at.x + 14, top: at.y + 14 }}
            role="status"
        >
            <div className="truncate text-sm font-semibold">{drag.book.title}</div>
            <div className={`text-xs ${target ? 'text-primary' : 'opacity-70'}`}>{hint}</div>
        </div>
    );
}
