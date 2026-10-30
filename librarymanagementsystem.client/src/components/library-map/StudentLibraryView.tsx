import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { floorHooks, rowHooks, sectionHooks, shelfHooks } from '../../api/resources.ts';
import type { Book } from '../../api/resources.ts';
import { buildLayout } from '../../lib/libraryLayout.ts';
import { sceneMetrics } from './floorPlan.ts';
import { LibraryDragProvider } from './LibraryDragProvider.tsx';
import { LibraryCanvas } from './LibraryScene.tsx';
import { buildRoute, routeRowFor } from './route.ts';

const noDrop = () => {};

interface StudentLibraryViewProps {
    books: Book[];
    /** The book to show the way to; null shows the building on its own. */
    selectedBook: Book | null;
    onClearSelection: () => void;
}

/** The whole library in 3D for readers: drag to spin it all the way round, with the route to a chosen book. */
export function StudentLibraryView({ books, selectedBook, onClearSelection }: StudentLibraryViewProps) {
    const floors = floorHooks.useList();
    const shelves = shelfHooks.useList();
    const rows = rowHooks.useList();
    const sections = sectionHooks.useList();
    const [autoRotate, setAutoRotate] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    const layouts = useMemo(
        () =>
            buildLayout({
                floors: floors.data ?? [],
                shelves: shelves.data ?? [],
                rows: rows.data ?? [],
                sections: sections.data ?? [],
                books,
            }),
        [floors.data, shelves.data, rows.data, sections.data, books],
    );

    const route = useMemo(() => {
        const rowId = routeRowFor((selectedBook?.rows ?? []).map(row => row.id), layouts);
        if (!rowId) return null;
        const { width, depth, storey } = sceneMetrics(layouts);
        return buildRoute(layouts, rowId, width, depth, storey);
    }, [selectedBook, layouts]);

    const loading = [floors, shelves, rows, sections].some(query => query.isLoading);

    return (
        <section id="student-3d" aria-label="3D view of the library" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">The library in 3D</h2>
                <div className="flex gap-1">
                    <button
                        type="button"
                        className={`btn btn-xs ${autoRotate ? 'btn-primary' : 'btn-ghost'}`}
                        aria-pressed={autoRotate}
                        onClick={() => setAutoRotate(on => !on)}
                    >
                        Auto-rotate
                    </button>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setResetKey(key => key + 1)}>
                        Reset view
                    </button>
                </div>
            </div>

            <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200 lg:h-[34rem]">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <span className="loading loading-spinner loading-lg" />
                    </div>
                ) : layouts.length === 0 ? (
                    <p className="p-6 text-center text-sm opacity-70">The library has no floors yet.</p>
                ) : (
                    <LibraryDragProvider onDrop={noDrop} readOnly>
                        <LibraryCanvas
                            floors={layouts}
                            stacked={layouts.length > 1}
                            route={route}
                            autoRotate={autoRotate}
                            resetKey={resetKey}
                        />
                    </LibraryDragProvider>
                )}
                <p className="pointer-events-none absolute top-2 left-2 max-w-[80%] rounded bg-base-100/90 px-2 py-1 text-xs shadow">
                    Drag to spin the library all the way round. Scroll to zoom, right-drag to move.
                </p>
            </div>

            {selectedBook && (
                <div className="rounded-box border border-base-300 bg-base-100 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-xs opacity-70">Way to</div>
                            <div className="truncate font-semibold">{selectedBook.title}</div>
                        </div>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={onClearSelection}>
                            Clear
                        </button>
                    </div>
                    {route ? (
                        <>
                            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
                                {route.steps.map(step => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                                <span className="opacity-70">About {Math.max(1, Math.round(route.distance))} m on foot.</span>
                                <Link className="link" to={`/student/map?find=${encodeURIComponent(selectedBook.title)}`}>
                                    Open full map
                                </Link>
                            </div>
                        </>
                    ) : (
                        <p className="mt-2 text-xs opacity-80">This book is not on a shelf, so there is no route.</p>
                    )}
                </div>
            )}
        </section>
    );
}
