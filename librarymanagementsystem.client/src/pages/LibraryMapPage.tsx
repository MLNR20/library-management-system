import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { bookHooks, bookStatusLabels, floorHooks, rowHooks, sectionHooks, shelfHooks } from '../api/resources.ts';
import type { Book, BookRequest } from '../api/resources.ts';
import { BookListPanel } from '../components/library-map/BookListPanel.tsx';
import { DragGhost } from '../components/library-map/DragGhost.tsx';
import { LibraryDragProvider } from '../components/library-map/LibraryDragProvider.tsx';
import { LibraryCanvas } from '../components/library-map/LibraryScene.tsx';
import { sectionColor, statusColors } from '../components/library-map/palette.ts';
import { useLibraryDrag } from '../components/library-map/useLibraryDrag.ts';
import { Page } from '../components/layout/Page.tsx';
import { getErrorMessage } from '../lib/api.ts';
import { buildLayout } from '../lib/libraryLayout.ts';
import type { FloorLayout } from '../lib/libraryLayout.ts';

type Notice = { kind: 'success' | 'error'; text: string };

/** The update endpoint takes the whole book, so carry every field over and change only the rows. */
function toBookRequest(book: Book, rowIds: string[]): BookRequest {
    return {
        title: book.title,
        isbn: book.isbn,
        edition: book.edition,
        pages: book.pages,
        status: book.status,
        dateAcquired: book.dateAcquired,
        genreId: book.genreId,
        authorIds: book.authors.map(a => a.id),
        languageIds: book.languages.map(l => l.id),
        rowIds,
    };
}

export function LibraryMapPage() {
    const books = bookHooks.useList();
    const floors = floorHooks.useList();
    const shelves = shelfHooks.useList();
    const rows = rowHooks.useList();
    const sections = sectionHooks.useList();
    const updateBook = bookHooks.useUpdate();
    const [notice, setNotice] = useState<Notice>();

    // Rebuilt only when the data changes, not on every drag/hover update.
    const layouts = useMemo(
        () =>
            buildLayout({
                floors: floors.data ?? [],
                shelves: shelves.data ?? [],
                rows: rows.data ?? [],
                sections: sections.data ?? [],
                books: books.data ?? [],
            }),
        [floors.data, shelves.data, rows.data, sections.data, books.data],
    );

    const rowLabels = useMemo(
        () => new Map((rows.data ?? []).map(r => [r.id, `${r.floorName} › ${r.shelfName} › ${r.name}`])),
        [rows.data],
    );

    const handleDrop = useCallback(
        async (book: Book, fromRowId: string | null, toRowId: string | null) => {
            const current = book.rows.map(r => r.id);
            // From the list: add the row. From a row: move (swap the old row for the new one) or just remove it.
            const next = current.filter(id => id !== fromRowId);
            if (toRowId && !next.includes(toRowId)) next.push(toRowId);

            const unchanged = next.length === current.length && next.every(id => current.includes(id));
            if (unchanged) {
                setNotice({ kind: 'success', text: `"${book.title}" is already there.` });
                return;
            }

            try {
                await updateBook.mutateAsync({ id: book.id, body: toBookRequest(book, next) });
                setNotice({
                    kind: 'success',
                    text: toRowId
                        ? `"${book.title}" ${fromRowId ? 'moved' : 'shelved'} in ${rowLabels.get(toRowId) ?? 'the row'}.`
                        : `"${book.title}" taken off ${rowLabels.get(fromRowId ?? '') ?? 'the row'}.`,
                });
            } catch (error) {
                setNotice({ kind: 'error', text: getErrorMessage(error) });
            }
        },
        [updateBook, rowLabels],
    );

    const loading = [books, floors, shelves, rows, sections].some(q => q.isLoading);
    const failed = [books, floors, shelves, rows, sections].find(q => q.isError);

    return (
        <Page
            title="Library map"
            description="A 3D view of every floor, shelf and row. Drag a book onto a row to shelve it."
        >
            {failed ? (
                <div role="alert" className="alert alert-error alert-soft">
                    Could not load the library: {getErrorMessage(failed.error)}
                </div>
            ) : loading ? (
                <div className="flex flex-1 items-center justify-center">
                    <span className="loading loading-spinner loading-lg" />
                </div>
            ) : (floors.data ?? []).length === 0 ? (
                <div className="alert alert-info alert-soft">
                    <span>
                        There are no floors yet. Add them on the <Link className="link" to="/floors">Floors</Link>,{' '}
                        <Link className="link" to="/shelves">Shelves</Link> and <Link className="link" to="/rows">Rows</Link>{' '}
                        pages and they will appear here.
                    </span>
                </div>
            ) : (
                <LibraryDragProvider onDrop={handleDrop}>
                    <MapBody
                        books={books.data ?? []}
                        layouts={layouts}
                        rowLabels={rowLabels}
                        saving={updateBook.isPending}
                        notice={notice}
                        onDismissNotice={() => setNotice(undefined)}
                    />
                    <DragGhost rowLabels={rowLabels} />
                </LibraryDragProvider>
            )}
        </Page>
    );
}

interface MapBodyProps {
    books: Book[];
    layouts: FloorLayout[];
    rowLabels: Map<string, string>;
    saving: boolean;
    notice?: Notice;
    onDismissNotice: () => void;
}

function MapBody({ books, layouts, rowLabels, saving, notice, onDismissNotice }: MapBodyProps) {
    const { hoverBook, selectedBookId } = useLibraryDrag();
    // 'all' stacks every floor; otherwise one floor's id. Null means "the first floor".
    const [floorChoice, setFloorChoice] = useState<string | null>(null);

    const activeChoice = floorChoice ?? layouts[0]?.floor.id ?? 'all';
    const visible = useMemo(
        () => (activeChoice === 'all' ? layouts : layouts.filter(l => l.floor.id === activeChoice)),
        [layouts, activeChoice],
    );
    const visibleSections = visible.flatMap(l => l.shelves.flatMap(s => s.sections));

    const infoBook = hoverBook ?? books.find(b => b.id === selectedBookId) ?? null;

    return (
        <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div role="tablist" className="tabs tabs-box tabs-sm" aria-label="Floor">
                    {layouts.map(layout => (
                        <button
                            key={layout.floor.id}
                            role="tab"
                            aria-selected={activeChoice === layout.floor.id}
                            className={`tab ${activeChoice === layout.floor.id ? 'tab-active' : ''}`}
                            onClick={() => setFloorChoice(layout.floor.id)}
                        >
                            {layout.floor.name}
                        </button>
                    ))}
                    {layouts.length > 1 && (
                        <button
                            role="tab"
                            aria-selected={activeChoice === 'all'}
                            className={`tab ${activeChoice === 'all' ? 'tab-active' : ''}`}
                            onClick={() => setFloorChoice('all')}
                        >
                            All floors
                        </button>
                    )}
                </div>
                {saving && (
                    <span className="flex items-center gap-2 text-sm opacity-70">
                        <span className="loading loading-spinner loading-xs" /> Saving...
                    </span>
                )}
            </div>

            {notice && (
                <div role="status" className={`alert alert-soft py-2 ${notice.kind === 'error' ? 'alert-error' : 'alert-success'}`}>
                    <span>{notice.text}</span>
                    <button className="btn btn-ghost btn-xs" onClick={onDismissNotice}>
                        Dismiss
                    </button>
                </div>
            )}

            <div className="grid min-h-[34rem] flex-1 gap-3 lg:h-[calc(100vh-17rem)] lg:flex-none lg:grid-cols-[20rem_minmax(0,1fr)]">
                <BookListPanel books={books} />

                <div className="relative min-h-[26rem] overflow-hidden rounded-box border border-base-300 bg-base-200">
                    <LibraryCanvas floors={visible} stacked={activeChoice === 'all'} />

                    {/* Overlays let pointer events through so the canvas underneath keeps working. */}
                    <div className="pointer-events-none absolute top-3 left-3 max-w-72 rounded-box bg-base-100/90 p-3 text-sm shadow">
                        {infoBook ? (
                            <>
                                <div className="font-semibold">{infoBook.title}</div>
                                <div className="opacity-70">
                                    {infoBook.authors.map(a => a.name).join(', ') || 'Unknown author'}
                                </div>
                                <div className="mt-1 text-xs">{bookStatusLabels[infoBook.status]}</div>
                                <ul className="mt-1 text-xs opacity-80">
                                    {infoBook.rows.length === 0 && <li>Not shelved yet</li>}
                                    {infoBook.rows.map(r => (
                                        <li key={r.id}>{rowLabels.get(r.id) ?? r.name}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <span className="opacity-70">Drag to rotate, scroll to zoom, right-drag to pan. Hover a book for details.</span>
                        )}
                    </div>

                    <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-1 rounded-box bg-base-100/90 px-3 py-2 text-xs shadow">
                        {Object.entries(bookStatusLabels).map(([value, label]) => (
                            <span key={value} className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: statusColors[Number(value) as keyof typeof statusColors] }} />
                                {label}
                            </span>
                        ))}
                        {visibleSections.map(section => (
                            <span key={section.id} className="flex items-center gap-1">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: sectionColor(section.id) }} />
                                {section.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
