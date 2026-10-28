import { createContext } from 'react';
import type { Book } from '../../api/resources.ts';

export interface DragState {
    book: Book;
    /** The row the book is being lifted out of, or null when dragged from the book list. */
    fromRowId: string | null;
    /** False until the pointer has moved a few pixels, so a plain click is not mistaken for a drag. */
    active: boolean;
    /** Pointer position when the drag became active (the ghost follows it from there). */
    x: number;
    y: number;
}

/** Finds the row under a screen position (or null). Registered by the 3D scene. */
export type RowPicker = (clientX: number, clientY: number) => string | null;

export interface LibraryDragValue {
    drag: DragState | null;
    /** The row the dragged book would land in right now. */
    hoverRowId: string | null;
    hoverBook: Book | null;
    setHoverBook: (book: Book) => void;
    /** Clears the hovered book, unless the pointer has already moved on to another one. */
    clearHoverBook: (bookId: string) => void;
    selectedBookId: string | null;
    beginDrag: (book: Book, fromRowId: string | null, pointer: { clientX: number; clientY: number }) => void;
    registerPicker: (picker: RowPicker | null) => void;
}

export const LibraryDragContext = createContext<LibraryDragValue | null>(null);
