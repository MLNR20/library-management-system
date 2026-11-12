import { SectionModel } from '../../api/resources.ts';
import { LOBBY_WIDTH, MIN_HALL, QUARTERS, quarterRect } from '../../lib/libraryLayout.ts';
import type { FloorLayout, WingLayout } from '../../lib/libraryLayout.ts';

// Where things stand on a floor. Shared by the 3D models and by the route finder, so a route never cuts through furniture.
//
// The hall is a square, `hall` across: x runs from the west wall (the main door) to the east edge, z from the north (back)
// wall to the south (front) wall. A cross of carpet runs through the middle, ending at a door on the west, north and south
// walls and at the foot of the stairs on the east arm. The carpet cross divides the hall into its wings (four quarters, or two halves).

export const SLAB_THICKNESS = 0.2;
/** Flat part of the stairwell at the top of a flight: the next floor's slab is only laid here. */
export const STAIR_LANDING = 1.2;
/** Gap between the end of the flight and the first step. */
export const STAIR_EDGE = 0.2;
const MAX_RISE = 0.35;
/** Headroom the opening in the floor above must give over the steps. */
const STAIR_HEADROOM = 2.4;

/** The stairs are one wide flight along the east arm of the carpet cross, every floor the same, climbing east to the east wall. */
export const STAIR_WIDTH = 1.8;
/** Depth of one step; the flight is as long as it takes to climb a storey at that slope, so taller floors get longer stairs. */
const STEP_RUN = 0.27;
export const stairLength = (storey: number) => Math.ceil(storey / MAX_RISE) * STEP_RUN + STAIR_EDGE + STAIR_LANDING;

export function stairGeometry(storey: number) {
    const count = Math.ceil(storey / MAX_RISE);
    return { count, rise: storey / count, run: STEP_RUN };
}

/** Length (along x, back from the end of the flight) of the opening in the floor above: just the part of the flight within head height of it. */
export function stairHole(storey: number) {
    const { rise, run } = stairGeometry(storey);
    return STAIR_LANDING + Math.ceil(STAIR_HEADROOM / rise) * run + 0.3;
}

/** Where the flight stands: it ends at the east edge of the hall; its foot (the first step) faces the main door in the west wall. */
export function flightFrame(hall: number, storey: number) {
    const length = stairLength(storey);
    return { length, centre: hall / 2 - length / 2, start: hall / 2 - length, end: hall / 2 };
}

export const WINDOW_WIDTH = 1.2;
export const WINDOW_HEIGHT = 1.7;
/** The windows start well above the panelling, leaving a band of plain wall under each. */
export const WINDOW_SILL = 2.2;

/** X positions of the windows along the back wall: spaced evenly each side of the north door. */
export function backWindowXs(hall: number): number[] {
    const xs: number[] = [];
    for (let x = 3.2; x <= hall / 2 - 1.5; x += 3.4) xs.push(-x, x);
    return xs.sort((a, b) => a - b);
}

/** Half the width of a door with its frame; the panelling stops this far either side of a door's middle. */
export const DOOR_HALF = 1.5;

/** The doors at the ends of the carpet cross: west (the main door), north and south. */
export const doorPositions = (hall: number) => ({
    west: { x: -hall / 2, z: 0 },
    north: { x: 0, z: -hall / 2 },
    south: { x: 0, z: hall / 2 },
});

/** Radius of a column's shaft at its foot. */
export const COLUMN_RADIUS = 0.2;
/** Half the width of the square plinth a column stands on: what it takes up on the floor. */
export const COLUMN_BASE_HALF = 0.25;
/** Width of the carpet that runs down each arm of the cross. */
export const WALKWAY_WIDTH = 1.4;
/** Distance from the middle of a carpet arm to its columns: just off the carpet's edge, inside the aisle the shelves keep clear. */
const COLUMN_OFFSET = WALKWAY_WIDTH / 2 + 0.28;
/** Distance between the two columns of a colonnade. */
export const COLUMN_SPACING = 3;
/** Nearest a column stands to the crossing, where the two carpets meet; the same either side of it. */
const COLUMN_FIRST = 1.6;
/** Every colonnade has this many columns. */
const COLUMNS_PER_LINE = 2;

/** X positions of the columns that used to stand along the front edge; the reading tables still keep to their spacing. */
function frontColumnXs(hall: number): number[] {
    const xs: number[] = [];
    for (let x = 1.5; x <= hall / 2 - 0.5; x += 4) xs.push(-x, x);
    return xs.sort((a, b) => a - b);
}

/** A line of freestanding columns beside one arm of the carpet cross. */
export interface Colonnade {
    columns: { x: number; z: number }[];
    /** Middle of the line. */
    x: number;
    z: number;
    /** True when the line runs along x (beside the west or east arm), false when it runs along z. */
    alongX: boolean;
    /** Distance between the first and the last column. */
    span: number;
}

/**
 * The lines of columns on the ground floor: one either side of each arm of the carpet cross, each of two columns starting
 * near the crossing and running out along the arm. An arm with no room for both columns (the east arm, which ends at the
 * foot of the stairs) gets none.
 */
export function colonnades(hall: number, storey: number): Colonnade[] {
    const alongs = Array.from({ length: COLUMNS_PER_LINE }, (_, i) => COLUMN_FIRST + i * COLUMN_SPACING);
    const reach = alongs[alongs.length - 1];
    if (reach > hall / 2 - 2.5) return [];
    const middle = (alongs[0] + reach) / 2;
    const span = reach - alongs[0];
    const eastRoom = hall / 2 - stairLength(storey) - 0.6;
    const lines: Colonnade[] = [];

    for (const side of [-1, 1]) {
        const offset = side * COLUMN_OFFSET;
        // West and east arms: the west one runs out to the main door, the east one only if both columns fit before the stairs.
        for (const way of [-1, 1]) {
            if (way > 0 && reach > eastRoom) continue;
            lines.push({ columns: alongs.map(a => ({ x: way * a, z: offset })), x: way * middle, z: offset, alongX: true, span });
        }
        // North and south arms: both run out towards a door.
        for (const way of [-1, 1]) {
            lines.push({ columns: alongs.map(a => ({ x: offset, z: way * a })), x: offset, z: way * middle, alongX: false, span });
        }
    }
    return lines;
}

/** Where every column of the ground floor stands. */
export const columnPositions = (hall: number, storey: number) => colonnades(hall, storey).flatMap(line => line.columns);

export const TABLE_LENGTH = 1.5;
export const TABLE_DEPTH = 0.8;
export const TABLE_HEIGHT = 0.75;
/** How far a chair stands from the middle of its table, along z. */
export const CHAIR_OFFSET = 0.8;

/** X positions of the reading tables along the front strip, each side of the south door. */
export function tableXs(hall: number): number[] {
    const side = frontColumnXs(hall).filter(x => x > 0);
    const xs = side.slice(1).map((x, i) => (x + side[i]) / 2);
    return [...xs.map(x => -x).reverse(), ...xs];
}

export const tableZ = (hall: number) => hall / 2 - 1.1;

/**
 * Where the tables of a reading-room wing stand: two in each of its quarters, at the outer end of the quarter (towards the
 * north or south wall), clear of the shelves that are counted out from the cross. `z` is shared by the pair.
 */
export function readingTables(hall: number, wing: WingLayout): { z: number; xs: number[] }[] {
    return wing.quarters.map(quarter => {
        const rect = quarterRect(hall, quarter);
        const outward = QUARTERS[quarter].sz;
        return { z: rect.z + outward * (rect.hz - 1.4), xs: [rect.x - rect.hx / 2, rect.x + rect.hx / 2] };
    });
}

export const DESK_LENGTH = 2;
export const DESK_DEPTH = 0.75;
export const DESK_HEIGHT = 1.05;

/** The librarian's desk: against the back wall, past the lobby by the main door, away from the north door's aisle. */
export const deskPosition = (hall: number) => ({
    x: -hall / 2 + LOBBY_WIDTH + 0.5 + DESK_LENGTH / 2,
    z: -hall / 2 + 1.15,
});

/** How far the low bookcases along the walls reach into the hall, the width of one of their bays, and their height. */
export const WALL_CASE_DEPTH = 0.45;
export const WALL_CASE_BAY = 0.9;
export const WALL_CASE_HEIGHT = 1.68;
/** Clearance kept round a door with its planters, and in from each corner (where a planter stands). */
const CASE_DOOR_CLEARANCE = DOOR_HALF + 1.8;
const CASE_CORNER_CLEARANCE = 1.5;

/** A run of low bookcases against a wall: the middle of its back on the wall, the turn that faces it into the hall, and its bays. */
export interface WallCaseRun {
    x: number;
    z: number;
    rotationY: number;
    bays: number;
    /** True for runs on the east and west walls, which run along z. */
    alongZ: boolean;
}

/** What is left of the stretch [from, to] once the `gaps` are taken out of it. */
function stretches(from: number, to: number, gaps: [number, number][]): [number, number][] {
    let pieces: [number, number][] = [[from, to]];
    for (const [a, b] of gaps) {
        pieces = pieces.flatMap(([p, q]): [number, number][] =>
            b <= p || a >= q ? [[p, q]] : ([[p, Math.min(q, a)], [Math.max(p, b), q]] as [number, number][]).filter(([s, e]) => e > s),
        );
    }
    return pieces;
}

/**
 * Where the ground floor's low bookcases stand: along the back, east and west walls (the front wall is glass), in runs of
 * whole bays, keeping clear of the doors and the planters beside them, the corners, the librarian's desk and the foot of
 * the stairs against the east wall. They stay below the window sills.
 */
export function wallBookcaseRuns(hall: number): WallCaseRun[] {
    const reach = hall / 2 - CASE_CORNER_CLEARANCE;
    const desk = deskPosition(hall);
    const door: [number, number] = [-CASE_DOOR_CLEARANCE, CASE_DOOR_CLEARANCE];
    const walls = [
        { gaps: [door, [desk.x - DESK_LENGTH / 2 - 0.5, desk.x + DESK_LENGTH / 2 + 0.5]] as [number, number][], place: (c: number) => ({ x: c, z: -hall / 2, rotationY: 0, alongZ: false }) },
        { gaps: [[-STAIR_WIDTH / 2 - 0.7, STAIR_WIDTH / 2 + 0.7]] as [number, number][], place: (c: number) => ({ x: hall / 2, z: c, rotationY: -Math.PI / 2, alongZ: true }) },
        { gaps: [door], place: (c: number) => ({ x: -hall / 2, z: c, rotationY: Math.PI / 2, alongZ: true }) },
    ];
    return walls.flatMap(wall =>
        stretches(-reach, reach, wall.gaps)
            .map(([a, b]) => ({ centre: (a + b) / 2, bays: Math.floor((b - a) / WALL_CASE_BAY) }))
            .filter(run => run.bays > 0)
            .map(run => ({ ...wall.place(run.centre), bays: run.bays })),
    );
}

/** Just inside the main door in the west wall. */
export const entrancePoint = (hall: number) => ({ x: -hall / 2 + 0.9, z: 0 });

/** An axis-aligned box on the floor, given by its centre and half sizes. */
export interface FloorRect {
    x: number;
    z: number;
    hx: number;
    hz: number;
}

/**
 * Everything on a floor that is not a shelf: tables with their chairs, the stairs, and on the ground floor the librarian's
 * desk and the colonnades beside the carpet.
 */
export function furnitureRects(hall: number, ground: boolean, wings: WingLayout[] = [], storey = 7): FloorRect[] {
    const rects: FloorRect[] = [];

    for (const wing of wings) {
        if (wing.model !== SectionModel.ReadingRoom) continue;
        for (const { z, xs } of readingTables(hall, wing)) {
            for (const x of xs) rects.push({ x, z, hx: TABLE_LENGTH / 2, hz: CHAIR_OFFSET + 0.25 });
        }
    }

    for (const x of tableXs(hall)) {
        rects.push({ x, z: tableZ(hall), hx: TABLE_LENGTH / 2, hz: CHAIR_OFFSET + 0.25 });
    }
    if (ground) {
        for (const { x, z } of columnPositions(hall, storey)) {
            rects.push({ x, z, hx: COLUMN_BASE_HALF, hz: COLUMN_BASE_HALF });
        }
        for (const run of wallBookcaseRuns(hall)) {
            const half = (run.bays * WALL_CASE_BAY) / 2;
            const inward = { x: Math.sin(run.rotationY), z: Math.cos(run.rotationY) };
            const middle = { x: run.x + (inward.x * WALL_CASE_DEPTH) / 2, z: run.z + (inward.z * WALL_CASE_DEPTH) / 2 };
            rects.push(
                run.alongZ
                    ? { ...middle, hx: WALL_CASE_DEPTH / 2, hz: half }
                    : { ...middle, hx: half, hz: WALL_CASE_DEPTH / 2 },
            );
        }
        const desk = deskPosition(hall);
        // The librarian's chair stands behind the desk.
        rects.push({ x: desk.x, z: desk.z - 0.3, hx: DESK_LENGTH / 2, hz: DESK_DEPTH / 2 + 0.3 });
    }
    const { length, centre } = flightFrame(hall, storey);
    rects.push({ x: centre, z: 0, hx: length / 2, hz: STAIR_WIDTH / 2 });

    return rects;
}

/** Size of the space the visible floors share: one square footprint for all (the hall, wings included), and the height of one storey. */
export function sceneMetrics(floors: FloorLayout[]) {
    // Tall enough for the tallest shelf plus plenty of headroom for the shelves to climb; it is also the rise of the stairs.
    const storey = Math.max(6, ...floors.map(f => f.height)) + 4;
    // Big enough for every floor's shelves, and for the lobby by the door plus the whole flight of stairs.
    const side = Math.max(MIN_HALL, LOBBY_WIDTH + 1 + stairLength(storey), ...floors.map(f => f.width));
    return { width: side, depth: side, storey };
}
