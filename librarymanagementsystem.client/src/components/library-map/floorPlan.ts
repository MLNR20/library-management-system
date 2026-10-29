import { STAIR_ZONE } from '../../lib/libraryLayout.ts';
import type { FloorLayout } from '../../lib/libraryLayout.ts';

// Where things stand on a floor. Shared by the 3D models and by the route finder, so a route never cuts through furniture.

export const SLAB_THICKNESS = 0.2;
/** Flat part of the stairwell at the top of a flight: the next floor's slab is only laid here. */
export const STAIR_LANDING = 1.2;
/** Gap between the front or back edge of the floor and the first step. */
export const STAIR_EDGE = 0.2;
const MAX_RISE = 0.3;

/** Direction (along z) a flight climbs: flights alternate so each one starts on the landing of the one below. */
export const stairDirection = (floorIndex: number): -1 | 1 => (floorIndex % 2 === 0 ? -1 : 1);

export function stairGeometry(depth: number, storey: number) {
    const count = Math.ceil(storey / MAX_RISE);
    return { count, rise: storey / count, run: (depth - STAIR_EDGE - STAIR_LANDING) / count };
}

export const COLUMN_RADIUS = 0.16;
/** Target distance between neighbouring columns along the front edge. */
const COLUMN_SPACING = 4;

/** X positions of the front columns: evenly spread from the left wall to the stair strip. */
export function columnXs(width: number): number[] {
    const left = -width / 2 + COLUMN_RADIUS + 0.1;
    // Stops a metre short of the stairs so the way onto the first step stays clear.
    const right = width / 2 - STAIR_ZONE - 1;
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

export const DESK_LENGTH = 2;
export const DESK_DEPTH = 0.75;
export const DESK_HEIGHT = 1.05;

export const deskPosition = (depth: number) => ({ x: -STAIR_ZONE / 2 + 1.2, z: -depth / 2 + 1.15 });

/** Just inside the main door in the back wall. */
export const entrancePoint = (width: number, depth: number) => ({ x: -width / 2 + 2, z: -depth / 2 + 0.5 });

/** An axis-aligned box on the floor, given by its centre and half sizes. */
export interface FloorRect {
    x: number;
    z: number;
    hx: number;
    hz: number;
}

/** Everything on a floor that is not a shelf: tables with their chairs, columns, the desk and the stairs. */
export function furnitureRects(width: number, depth: number, hasDesk: boolean): FloorRect[] {
    const rects: FloorRect[] = [];

    for (const x of tableXs(width)) {
        rects.push({ x, z: tableZ(depth), hx: TABLE_LENGTH / 2, hz: CHAIR_OFFSET + 0.25 });
    }
    for (const x of columnXs(width)) {
        rects.push({ x, z: COLUMN_Z(depth), hx: COLUMN_RADIUS, hz: COLUMN_RADIUS });
    }
    if (hasDesk) {
        const desk = deskPosition(depth);
        // The librarian's chair stands behind the desk.
        rects.push({ x: desk.x, z: desk.z - 0.3, hx: DESK_LENGTH / 2, hz: DESK_DEPTH / 2 + 0.3 });
    }
    rects.push({ x: width / 2 - STAIR_ZONE / 2, z: 0, hx: STAIR_ZONE / 2, hz: depth / 2 });

    return rects;
}

/** Size of the space the visible floors share: one footprint for all, and the height of one storey. */
export function sceneMetrics(floors: FloorLayout[]) {
    return {
        width: Math.max(9, ...floors.map(f => f.width)),
        depth: Math.max(7, ...floors.map(f => f.depth)),
        // Tall enough for the tallest shelf plus headroom; it is also the rise of the stairs.
        storey: Math.max(4, ...floors.map(f => f.height)) + 3,
    };
}
