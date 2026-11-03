import { SectionModel } from '../../api/resources.ts';
import { STAIR_ZONE, extensionCenterX } from '../../lib/libraryLayout.ts';
import type { ExtensionLayout, FloorLayout } from '../../lib/libraryLayout.ts';

// Where things stand on a floor. Shared by the 3D models and by the route finder, so a route never cuts through furniture.

export const SLAB_THICKNESS = 0.2;
/** Flat part of the stairwell at the top of a flight: the next floor's slab is only laid here. */
export const STAIR_LANDING = 1.2;
/** Gap between the end of the flight and the first step. */
export const STAIR_EDGE = 0.2;
const MAX_RISE = 0.35;
/** Floors are at least this big: a flight needs room to climb a storey at a walkable slope. */
const MIN_DEPTH = 11;
const MIN_WIDTH = 12;

/** The stairs are one wide flight across the middle of the floor, running along x; the floor's right wall is where it ends. */
export const STAIR_WIDTH = 1.8;
export const STAIR_LENGTH = 6.5;

export const WINDOW_WIDTH = 1.2;
export const WINDOW_HEIGHT = 1.7;
/** The windows start well above the panelling, leaving a band of plain wall under each. */
export const WINDOW_SILL = 2.2;

/** X positions of the windows along the back wall, spaced evenly and clear of the lobby corner. */
export function backWindowXs(width: number): number[] {
    const xs: number[] = [];
    for (let x = -width / 2 + 4.2; x < width / 2 - 1; x += 3.4) xs.push(x);
    return xs;
}

/** The main door stands in the middle of the left wall (z = 0); half of it, with its frame, is this wide. */
export const DOOR_Z = 0;
export const DOOR_HALF = 1.5;

/** Where the flight stands: its length along x and the x of its middle. */
export function flightFrame(width: number) {
    return { length: STAIR_LENGTH, centre: width / 2 - STAIR_LENGTH / 2 };
}

/**
 * Direction (along x) a flight climbs: flights alternate so each one starts on the landing of the one below. The first
 * climbs from the left, with its foot facing the door and the runner leading to it, up to the right wall.
 */
export const stairDirection = (floorIndex: number): -1 | 1 => (floorIndex % 2 === 0 ? 1 : -1);

export function stairGeometry(storey: number) {
    const count = Math.ceil(storey / MAX_RISE);
    return { count, rise: storey / count, run: (STAIR_LENGTH - STAIR_EDGE - STAIR_LANDING) / count };
}

export const COLUMN_RADIUS = 0.16;
/** Target distance between neighbouring columns along the front edge. */
const COLUMN_SPACING = 4;

/** X positions of the front columns: evenly spread from the stair strip to the right wall. */
export function columnXs(width: number): number[] {
    // Starts a metre past the stairs so the way onto the first step stays clear.
    const left = -width / 2 + STAIR_ZONE + 1;
    const right = width / 2 - COLUMN_RADIUS - 0.1;
    const count = Math.max(2, Math.round((right - left) / COLUMN_SPACING) + 1);
    return Array.from({ length: count }, (_, i) => left + ((right - left) * i) / (count - 1));
}

export const COLUMN_Z = (depth: number) => depth / 2 - COLUMN_RADIUS - 0.1;

export const TABLE_LENGTH = 1.5;
export const TABLE_DEPTH = 0.8;
export const TABLE_HEIGHT = 0.75;
/** How far a chair stands from the middle of its table, along z. */
export const CHAIR_OFFSET = 0.8;

/** X positions of the reading tables: halfway between neighbouring columns. */
export function tableXs(width: number): number[] {
    const xs = columnXs(width);
    return xs.slice(1).map((x, i) => (x + xs[i]) / 2);
}

export const tableZ = (depth: number) => depth / 2 - 1.1;

/** X positions of the tables in a reading room, measured from the middle of the room. */
export const readingRoomTableXs = (extension: ExtensionLayout): number[] => [-extension.width / 4, extension.width / 4];

export const DESK_LENGTH = 2;
export const DESK_DEPTH = 0.75;
export const DESK_HEIGHT = 1.05;

/** Width of the runner that leads from the main door (in the middle of the left wall) across the floor. */
export const WALKWAY_WIDTH = 1.4;

/** The librarian's desk: against the back wall, past the lobby by the door. */
export const deskPosition = (width: number, depth: number) => ({
    x: -width / 2 + STAIR_ZONE + 0.5 + DESK_LENGTH / 2,
    z: -depth / 2 + 1.15,
});

/** Just inside the main door in the left wall. */
export const entrancePoint = (width: number) => ({ x: -width / 2 + 0.9, z: DOOR_Z });

/** An axis-aligned box on the floor, given by its centre and half sizes. */
export interface FloorRect {
    x: number;
    z: number;
    hx: number;
    hz: number;
}

/** Everything on a floor that is not a shelf: tables with their chairs, columns, the desk and the stairs. */
export function furnitureRects(width: number, depth: number, hasDesk: boolean, extensions: ExtensionLayout[] = []): FloorRect[] {
    const rects: FloorRect[] = [];

    for (const extension of extensions) {
        if (extension.model !== SectionModel.ReadingRoom) continue;
        for (const x of readingRoomTableXs(extension)) {
            rects.push({ x: extensionCenterX(width, extension) + x, z: tableZ(depth), hx: TABLE_LENGTH / 2, hz: CHAIR_OFFSET + 0.25 });
        }
    }

    for (const x of tableXs(width)) {
        rects.push({ x, z: tableZ(depth), hx: TABLE_LENGTH / 2, hz: CHAIR_OFFSET + 0.25 });
    }
    for (const x of columnXs(width)) {
        rects.push({ x, z: COLUMN_Z(depth), hx: COLUMN_RADIUS, hz: COLUMN_RADIUS });
    }
    if (hasDesk) {
        const desk = deskPosition(width, depth);
        // The librarian's chair stands behind the desk.
        rects.push({ x: desk.x, z: desk.z - 0.3, hx: DESK_LENGTH / 2, hz: DESK_DEPTH / 2 + 0.3 });
    }
    const { length, centre } = flightFrame(width);
    rects.push({ x: centre, z: 0, hx: length / 2, hz: STAIR_WIDTH / 2 });

    return rects;
}

/** Size of the space the visible floors share: one footprint for all, and the height of one storey. */
export function sceneMetrics(floors: FloorLayout[]) {
    return {
        width: Math.max(MIN_WIDTH, ...floors.map(f => f.width)),
        depth: Math.max(MIN_DEPTH, ...floors.map(f => f.depth)),
        // Tall enough for the tallest shelf plus headroom; it is also the rise of the stairs.
        storey: Math.max(4, ...floors.map(f => f.height)) + 3,
        // How far the widest wing or reading room reaches past the right wall; only used to frame the camera.
        reach: Math.max(0, ...floors.map(f => f.extensionWidth)),
    };
}
