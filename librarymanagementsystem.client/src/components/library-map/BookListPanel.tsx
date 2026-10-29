import { useMemo, useState } from 'react';
import { bookStatusLabels } from '../../api/resources.ts';
import type { Book } from '../../api/resources.ts';
import { bookMatchesSearch } from '../../lib/bookSearch.ts';
import { UNSHELVE_ZONE_ATTRIBUTE } from './LibraryDragProvider.tsx';
import { statusColors } from './palette.ts';
import { useLibraryDrag } from './useLibraryDrag.ts';

interface BookListPanelProps {
    books: Book[];
    /** For readers: pick a book to see where it is, nothing can be dragged. */
    readOnly?: boolean;
    search: string;
    onSearchChange: (search: string) => void;
}

/** The books to pick up and drag. Also the drop zone for taking a book off its row. */
export function BookListPanel({ books, readOnly = false, search, onSearchChange }: BookListPanelProps) {
    const { drag, beginDrag, selectedBookId } = useLibraryDrag();
    const [unshelvedOnly, setUnshelvedOnly] = useState(false);

    const visible = useMemo(
        () => books.filter(book => (!unshelvedOnly || book.rows.length === 0) && bookMatchesSearch(book, search)),
        [books, search, unshelvedOnly],
    );

    const unshelveReady = !!drag?.active && drag.fromRowId !== null;
    const unshelvedCount = books.filter(book => book.rows.length === 0).length;

    return (
        <aside
            {...{ [UNSHELVE_ZONE_ATTRIBUTE]: true }}
            className={`flex min-h-0 flex-col gap-3 rounded-box border bg-base-100 p-3 transition-colors ${
                unshelveReady ? 'border-primary bg-primary/10' : 'border-base-300'
            }`}
            aria-label="Books"
        >
            <div>
                <h2 className="font-semibold">Books</h2>
                <p className="text-xs opacity-70">
                    {readOnly
                        ? 'Pick a book to see the way to it.'
                        : unshelveReady
                          ? 'Release here to take the book off its row.'
                          : 'Drag a book onto a row of a shelf. Drag a shelved book to move it, or back here to unshelve it.'}
                </p>
            </div>

            <input
                type="search"
                className="input input-sm w-full"
                placeholder="Find a book: title, author, ISBN..."
                value={search}
                onChange={event => onSearchChange(event.target.value)}
                aria-label="Search books"
            />
            {!readOnly && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={unshelvedOnly}
                        onChange={event => setUnshelvedOnly(event.target.checked)}
                    />
                    Only unshelved ({unshelvedCount})
                </label>
            )}

            <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                {visible.length === 0 && <li className="p-2 text-sm opacity-60">No books match.</li>}
                {visible.map(book => (
                    <li key={book.id}>
                        <div
                            role="button"
                            tabIndex={0}
                            onPointerDown={event => {
                                if (event.button !== 0) return;
                                event.preventDefault();
                                beginDrag(book, null, event);
                            }}
                            className={`flex items-center gap-2 rounded-field border px-2 py-1.5 select-none ${
                                readOnly ? 'cursor-pointer' : 'cursor-grab touch-none active:cursor-grabbing'
                            } ${
                                selectedBookId === book.id ? 'border-primary bg-primary/10' : 'border-base-300 hover:bg-base-200'
                            }`}
                            aria-label={readOnly ? `${book.title}. Show the way to it.` : `${book.title}. Drag onto a shelf row to shelve it.`}
                        >
                            <span
                                className="h-6 w-2 shrink-0 rounded-sm"
                                style={{ background: statusColors[book.status] }}
                                title={bookStatusLabels[book.status]}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{book.title}</span>
                                <span className="block truncate text-xs opacity-70">
                                    {book.rows.length === 0
                                        ? 'Not shelved'
                                        : `${book.rows.length} ${book.rows.length === 1 ? 'row' : 'rows'}`}
                                </span>
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
