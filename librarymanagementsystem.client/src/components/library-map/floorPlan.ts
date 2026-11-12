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

export const COLUMN_RADIUS = 0.16;
/** Width of the carpet that runs down each arm of the cross. */
export const WALKWAY_WIDTH = 1.4;
/** Distance from the middle of a carpet arm to its columns: just off the carpet's edge, inside the aisle the shelves keep clear. */
const COLUMN_OFFSET = WALKWAY_WIDTH / 2 + 0.28;
/** Distance between neighbouring columns along a carpet arm. */
const COLUMN_SPACING = 3;
/** Nearest a column stands to the crossing, where the two carpets meet; the same either side of it. */
const COLUMN_FIRST = 1.6;

/** X positions of the columns that used to stand along the front edge; the reading tables still keep to their spacing. */
function frontColumnXs(hall: number): number[] {
    const xs: number[] = [];
    for (let x = 1.5; x <= hall / 2 - 0.5; x += 4) xs.push(-x, x);
    return xs.sort((a, b) => a - b);
}

/**
 * Where the columns stand: in pairs either side of each arm of the carpet cross, spaced along the arm from the crossing out
 * to the doors and the foot of the stairs, clear of the doors' frames and of the flight.
 */
export function columnPositions(hall: number, storey: number): { x: number; z: number }[] {
    const points: { x: number; z: number }[] = [];
    const eastLimit = hall / 2 - stairLength(storey) - 0.6;

    for (let along = COLUMN_FIRST; along <= hall / 2 - 2.5; along += COLUMN_SPACING) {
        // West-east arm: the west side runs out to the main door, the east side stops before the stairs.
        for (const x of [-along, along]) {
            if (x > eastLimit) continue;
            points.push({ x, z: -COLUMN_OFFSET }, { x, z: COLUMN_OFFSET });
        }
        // North-south arm: both ends run out to a door.
        for (const z of [-along, along]) points.push({ x: -COLUMN_OFFSET, z }, { x: COLUMN_OFFSET, z });
    }
    return points;
}

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

/** Just inside the main door in the west wall. */
export const entrancePoint = (hall: number) => ({ x: -hall / 2 + 0.9, z: 0 });

/** An axis-aligned box on the floor, given by its centre and half sizes. */
export interface FloorRect {
    x: number;
    z: number;
    hx: number;
    hz: number;
}

/** Everything on a floor that is not a shelf: tables with their chairs, columns, the desk and the stairs. */
export function furnitureRects(hall: number, hasDesk: boolean, wings: WingLayout[] = [], storey = 7): FloorRect[] {
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
    for (const { x, z } of columnPositions(hall, storey)) {
        rects.push({ x, z, hx: COLUMN_RADIUS, hz: COLUMN_RADIUS });
    }
    if (hasDesk) {
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
