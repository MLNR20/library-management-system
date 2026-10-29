import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Book } from '../../api/resources.ts';
import { LibraryDragContext } from './dragContext.ts';
import type { DragState, LibraryDragValue, RowPicker } from './dragContext.ts';

/** Elements with this attribute accept a book dragged out of a row, to take it off the shelf. */
export const UNSHELVE_ZONE_ATTRIBUTE = 'data-unshelve-zone';

const DRAG_THRESHOLD_PX = 5;

interface LibraryDragProviderProps {
    /** `toRowId` is null when a book was dropped on an unshelve zone. */
    onDrop: (book: Book, fromRowId: string | null, toRowId: string | null) => void;
    children: ReactNode;
}

/**
 * Pointer-based drag and drop between the book list, the 3D scene and the unshelve zone.
 * HTML5 drag events do not fire pointer events over a WebGL canvas, so this tracks the pointer itself.
 */
export function LibraryDragProvider({ onDrop, children }: LibraryDragProviderProps) {
    const [drag, setDrag] = useState<DragState | null>(null);
    const [hoverRowId, setHoverRowId] = useState<string | null>(null);
    const [hoverBook, setHoverBook] = useState<Book | null>(null);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

    const pickerRef = useRef<RowPicker | null>(null);
    const hoverRowRef = useRef<string | null>(null);
    const onDropRef = useRef(onDrop);
    useEffect(() => {
        onDropRef.current = onDrop;
    }, [onDrop]);

    const registerPicker = useCallback((picker: RowPicker | null) => {
        pickerRef.current = picker;
    }, []);

    const beginDrag = useCallback<LibraryDragValue['beginDrag']>((book, fromRowId, pointer) => {
        const origin = { x: pointer.clientX, y: pointer.clientY };
        let active = false;
        setDrag({ book, fromRowId, active: false, x: origin.x, y: origin.y });

        const pick = (x: number, y: number) => pickerRef.current?.(x, y) ?? null;

        const onMove = (event: PointerEvent) => {
            if (!active) {
                if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < DRAG_THRESHOLD_PX) return;
                active = true;
                document.body.style.userSelect = 'none';
                setDrag({ book, fromRowId, active: true, x: event.clientX, y: event.clientY });
            }
            const rowId = pick(event.clientX, event.clientY);
            if (rowId !== hoverRowRef.current) {
                hoverRowRef.current = rowId;
                setHoverRowId(rowId);
            }
        };

        const finish = (event: PointerEvent | null) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            document.body.style.userSelect = '';

            if (event && !active) {
                // Never moved: it was a click, so select the book instead.
                setSelectedBookId(current => (current === book.id ? null : book.id));
            } else if (event && active) {
                const toRowId = pick(event.clientX, event.clientY);
                const overUnshelveZone = !!document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest(`[${UNSHELVE_ZONE_ATTRIBUTE}]`);
                if (toRowId) onDropRef.current(book, fromRowId, toRowId);
                else if (overUnshelveZone && fromRowId) onDropRef.current(book, fromRowId, null);
            }

            hoverRowRef.current = null;
            setHoverRowId(null);
            setDrag(null);
        };

        const onUp = (event: PointerEvent) => finish(event);
        const onCancel = () => finish(null);
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') finish(null);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    }, []);

    const clearHoverBook = useCallback((bookId: string) => {
        setHoverBook(current => (current?.id === bookId ? null : current));
    }, []);

    const value = useMemo<LibraryDragValue>(
        () => ({
            drag,
            hoverRowId,
            hoverBook,
            setHoverBook,
            clearHoverBook,
            selectedBookId,
            selectBook: setSelectedBookId,
            beginDrag,
            registerPicker,
        }),
        [drag, hoverRowId, hoverBook, clearHoverBook, selectedBookId, beginDrag, registerPicker],
    );

    return <LibraryDragContext.Provider value={value}>{children}</LibraryDragContext.Provider>;
}
