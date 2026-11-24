import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { floorHooks, rowHooks, sectionHooks, shelfHooks } from '../../api/resources.ts';
import type { Book, Section } from '../../api/resources.ts';
import { tableHooks } from '../../api/tables.ts';
import type { StudyTable } from '../../api/tables.ts';
import { buildLayout } from '../../lib/libraryLayout.ts';
import type { WalkState } from './FirstPersonRig.tsx';
import { sceneMetrics } from './floorPlan.ts';
import { LibraryDragProvider } from './LibraryDragProvider.tsx';
import { LibraryCanvas } from './LibraryScene.tsx';
import { buildRoute, buildRouteToSpot, routeRowFor } from './route.ts';
import { roomSpot, tableSpot } from './spots.ts';
import { buildWalkPath } from './walkthrough.ts';

const noDrop = () => {};

/** What a reader is looking for: a book on a shelf, a table, or a whole reading room. */
export type FindTarget =
    | { kind: 'book'; book: Book }
    | { kind: 'table'; table: StudyTable }
    | { kind: 'room'; room: Section };

const targetId = (target: FindTarget) =>
    target.kind === 'book' ? target.book.id : target.kind === 'table' ? target.table.id : target.room.id;
const targetTitle = (target: FindTarget) =>
    target.kind === 'book' ? target.book.title : target.kind === 'table' ? target.table.name : target.room.name;
const noRoute: Record<FindTarget['kind'], string> = {
    book: 'This book is not on a shelf, so there is no route.',
    table: 'This table is not in a reading room on the map, so there is no route.',
    room: 'This reading room is not on the map, so there is no route.',
};

/** Asks the view to start the first-person walk to a target. A new `id` is a new request, even for the same target. */
export interface WalkRequest {
    targetId: string;
    id: number;
}

interface StudentLibraryViewProps {
    books: Book[];
    /** What to show the way to; null shows the building on its own. */
    target: FindTarget | null;
    onClearSelection: () => void;
    walkRequest?: WalkRequest | null;
}

/** One walk through the library to one target. The state is shared with the camera, which moves it on every frame. */
interface WalkSession {
    targetId: string;
    state: { current: WalkState };
}

function startWalk(targetId: string): WalkSession {
    // Someone who asked their system for less motion starts paused, and steps through with the slider.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return { targetId, state: { current: { distance: 0, playing: !reducedMotion } } };
}

/** The whole library in 3D for readers: drag to spin it all the way round, with the route to a chosen book. */
export function StudentLibraryView({ books, target, onClearSelection, walkRequest = null }: StudentLibraryViewProps) {
    const floors = floorHooks.useList();
    const shelves = shelfHooks.useList();
    const rows = rowHooks.useList();
    const sections = sectionHooks.useList();
    const tables = tableHooks.useList();
    const [autoRotate, setAutoRotate] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const [session, setSession] = useState<WalkSession | null>(null);
    const [handledRequest, setHandledRequest] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [expanded, setExpanded] = useState(false);

    // A "Walk there" pressed on a book card starts a walk. Done while rendering, so it never shows a frame of the old view.
    if (walkRequest && walkRequest.id !== handledRequest) {
        const next = startWalk(walkRequest.targetId);
        setHandledRequest(walkRequest.id);
        setSession(next);
        setProgress(0);
        setPlaying(next.state.current.playing);
    }

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
    const stacked = layouts.length > 1;

    const route = useMemo(() => {
        if (!target) return null;
        const { width, depth, storey } = sceneMetrics(layouts);
        if (target.kind === 'book') {
            const rowId = routeRowFor(target.book.rows.map(row => row.id), layouts);
            return rowId ? buildRoute(layouts, rowId, width, depth, storey) : null;
        }
        const spot =
            target.kind === 'table'
                ? tableSpot(layouts, width, target.table, tables.data ?? [])
                : roomSpot(layouts, width, target.room);
        return spot ? buildRouteToSpot(layouts, spot, width, depth, storey) : null;
    }, [target, layouts, tables.data]);

    const walkPath = useMemo(
        () => (route ? buildWalkPath(route, sceneMetrics(layouts).storey, stacked) : null),
        [route, layouts, stacked],
    );

    // The walk belongs to what it was started for: choosing something else or clearing the choice ends it.
    const walking = !!session && !!walkPath && !!target && session.targetId === targetId(target);
    const arrived = progress >= 0.999;

    const beginWalk = (picked: FindTarget) => {
        const next = startWalk(targetId(picked));
        setSession(next);
        setProgress(0);
        setPlaying(next.state.current.playing);
    };

    const endWalk = useCallback(() => {
        setSession(null);
        setExpanded(false);
        // Put the orbit camera back where it starts: the walk left it inside the building.
        setResetKey(key => key + 1);
    }, []);

    const togglePlay = () => {
        if (!session || !walkPath) return;
        const walk = session.state.current;
        if (walk.distance >= walkPath.total) {
            // Replay: back to the door, walking.
            walk.distance = 0;
            walk.playing = true;
        } else {
            walk.playing = !walk.playing;
        }
        setPlaying(walk.playing);
    };

    const scrub = (fraction: number) => {
        if (!session || !walkPath) return;
        session.state.current.distance = fraction * walkPath.total;
        setProgress(fraction);
    };

    // Escape leaves the walk (and the full-screen view).
    useEffect(() => {
        if (!walking) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') endWalk();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [walking, endWalk]);

    const loading = [floors, shelves, rows, sections].some(query => query.isLoading);
    const finalStep = route?.steps[route.steps.length - 1];

    return (
        <section id="student-3d" aria-label="3D view of the library" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{walking ? 'Walking through the library' : 'The library in 3D'}</h2>
                <div className="flex gap-1">
                    {!walking && (
                        <button
                            type="button"
                            className={`btn btn-xs ${autoRotate ? 'btn-primary' : 'btn-ghost'}`}
                            aria-pressed={autoRotate}
                            onClick={() => setAutoRotate(on => !on)}
                        >
                            Auto-rotate
                        </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setResetKey(key => key + 1)}>
                        Reset view
                    </button>
                </div>
            </div>

            <div
                className={
                    expanded && walking
                        ? 'fixed inset-0 z-[100] overflow-hidden bg-base-200'
                        : 'relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200 lg:h-[34rem]'
                }
            >
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
                            stacked={stacked}
                            route={route}
                            autoRotate={autoRotate}
                            resetKey={resetKey}
                            walk={
                                walking && session && walkPath && target
                                    ? {
                                          path: walkPath,
                                          state: session.state,
                                          onProgress: setProgress,
                                          bookId: target.kind === 'book' ? target.book.id : undefined,
                                      }
                                    : undefined
                            }
                        />
                    </LibraryDragProvider>
                )}
                <p className="pointer-events-none absolute top-2 left-2 max-w-[80%] rounded bg-base-100/90 px-2 py-1 text-xs shadow">
                    {walking
                        ? arrived
                            ? `You have arrived. ${finalStep ?? ''} The orange marker shows the spot.`
                            : `Walking to ${target ? targetTitle(target) : ''}. Drag to look around.`
                        : 'Drag to spin the library all the way round. Scroll to zoom, right-drag to move.'}
                </p>

                {walking && (
                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-box bg-base-100/90 p-2 shadow">
                        <button type="button" className="btn btn-primary btn-xs w-16" onClick={togglePlay}>
                            {arrived ? 'Replay' : playing ? 'Pause' : 'Play'}
                        </button>
                        <input
                            type="range"
                            className="range range-primary range-xs flex-1"
                            min={0}
                            max={1}
                            step={0.001}
                            value={progress}
                            aria-label="How far along the walk"
                            onChange={event => scrub(Number(event.target.value))}
                        />
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setExpanded(on => !on)}>
                            {expanded ? 'Smaller' : 'Full screen'}
                        </button>
                        <button type="button" className="btn btn-xs" onClick={endWalk}>
                            Leave
                        </button>
                    </div>
                )}
            </div>

            {target && (
                <div className="rounded-box border border-base-300 bg-base-100 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-xs opacity-70">Way to</div>
                            <div className="truncate font-semibold">{targetTitle(target)}</div>
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
                                {target.kind === 'book' ? (
                                    <Link className="link" to={`/student/map?find=${encodeURIComponent(target.book.title)}`}>
                                        Open full map
                                    </Link>
                                ) : (
                                    <Link className="link" to={target.kind === 'table' ? '/student/tables' : '/student/rooms'}>
                                        Reserve it
                                    </Link>
                                )}
                            </div>
                            {!walking && walkPath && (
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm mt-3 w-full"
                                    onClick={() => beginWalk(target)}
                                >
                                    Walk there in first person
                                </button>
                            )}
                        </>
                    ) : (
                        <p className="mt-2 text-xs opacity-80">{noRoute[target.kind]}</p>
                    )}
                </div>
            )}
        </section>
    );
}
