import { PLANK, SHELF_DEPTH, SHELF_WIDTH, STAIR_ZONE, TIER_HEIGHT } from '../../lib/libraryLayout.ts';
import type { FloorLayout, ShelfLayout } from '../../lib/libraryLayout.ts';
import { buildGrid, findPath } from '../../lib/pathfinding.ts';
import type { Box, Point2 } from '../../lib/pathfinding.ts';
import {
    STAIR_EDGE,
    STAIR_LANDING,
    entrancePoint,
    furnitureRects,
    stairDirection,
    stairGeometry,
} from './floorPlan.ts';

export type Point3 = [number, number, number];

/** The part of a route that lies on one floor. Coordinates are in that floor's own space. */
export interface RouteSegment {
    /** Position of the floor in the list that was drawn (0 = lowest visible floor). */
    index: number;
    points: Point3[];
}

export interface Route {
    segments: RouteSegment[];
    /** Where the walk starts (the main door), when the route begins at the entrance. */
    entrance: { index: number; position: Point3 } | null;
    /** The spot on the shelf where the book sits. */
    destination: { index: number; position: Point3 };
    /** Turn-by-turn directions in plain words. */
    steps: string[];
    /** Walking distance in map units (roughly metres). */
    distance: number;
}

const WALK_HEIGHT = 0.06;
/** Space kept clear around furniture and shelves so the line does not hug them. */
const CLEARANCE = 0.2;
/** How far in front of a shelf the person stands. */
const STAND_DISTANCE = SHELF_DEPTH / 2 + 0.65;

function shelfBox(shelf: ShelfLayout): Box {
    const quarterTurn = shelf.shelf.rotation === 90;
    return {
        x: shelf.x,
        z: shelf.z,
        hx: quarterTurn ? SHELF_DEPTH / 2 : SHELF_WIDTH / 2,
        hz: quarterTurn ? SHELF_WIDTH / 2 : SHELF_DEPTH / 2,
    };
}

/** The way a shelf faces: its books look along local +z, turned by the shelf's rotation. */
function facing(shelf: ShelfLayout): Point2 {
    const angle = (shelf.shelf.rotation * Math.PI) / 180;
    return [Math.sin(angle), Math.cos(angle)];
}

function lift(points: Point2[], y = WALK_HEIGHT): Point3[] {
    return points.map(([x, z]) => [x, y, z]);
}

function length(points: Point3[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
    }
    return total;
}

/**
 * Plans the walk from the main door to a row: across the floor to the stairs and up them when the row is on a
 * higher floor, then to the front of its shelf. `floors` are the floors being drawn (bottom first), sharing one
 * `width` x `depth` footprint and one `storey` height. Returns null when the row is not on any of them.
 */
export function buildRoute(floors: FloorLayout[], rowId: string, width: number, depth: number, storey: number): Route | null {
    const targetIndex = floors.findIndex(floor => floor.shelves.some(shelf => shelf.tiers.some(tier => tier.row.id === rowId)));
    if (targetIndex < 0) return null;

    const laneX = width / 2 - STAIR_ZONE / 2;
    // Where someone steps out of / into the stair strip, a little to its left.
    const entryX = width / 2 - STAIR_ZONE - 0.5;
    const { count, rise, run } = stairGeometry(depth, storey);

    const segments: RouteSegment[] = [];
    const steps: string[] = [];
    let entrance: Route['entrance'] = null;
    let destination: Route['destination'] | null = null;

    for (let index = 0; index <= targetIndex; index++) {
        const floor = floors[index];
        const grid = buildGrid(
            width,
            depth,
            [...floor.shelves.map(shelfBox), ...furnitureRects(width, depth, floor.level === 0)],
            CLEARANCE,
            0.25,
        );

        let from: Point2;
        if (index === 0 && floor.level === 0) {
            const door = entrancePoint(width, depth);
            from = [door.x, door.z];
            entrance = { index, position: [door.x, WALK_HEIGHT, door.z] };
            steps.push(`Come in through the main door at the back of the ${floor.floor.name.toLowerCase()}.`);
        } else if (index === 0) {
            from = [entryX, 0];
        } else {
            // Arrived from the flight below, on the landing at its far end.
            from = [entryX, stairDirection(index - 1) * (depth / 2 - STAIR_LANDING / 2)];
        }

        const points: Point3[] = [];

        if (index < targetIndex) {
            const direction = stairDirection(index);
            const startZ = -direction * (depth / 2 - STAIR_EDGE);
            const walk = findPath(grid, from, [entryX, startZ]) ?? [from, [entryX, startZ]];
            points.push(...lift(walk));
            points.push([laneX, WALK_HEIGHT, startZ]);
            for (let step = 0; step < count; step++) {
                points.push([laneX, (step + 1) * rise + WALK_HEIGHT, startZ + direction * (step + 0.5) * run]);
            }
            points.push([laneX, storey + WALK_HEIGHT, direction * (depth / 2 - STAIR_LANDING / 2)]);
            steps.push(`Take the stairs up to the ${floors[index + 1].floor.name.toLowerCase()}.`);
        } else {
            const shelf = floor.shelves.find(s => s.tiers.some(tier => tier.row.id === rowId))!;
            const tierIndex = shelf.tiers.findIndex(tier => tier.row.id === rowId);
            const [fx, fz] = facing(shelf);
            const stand: Point2 = [shelf.x + fx * STAND_DISTANCE, shelf.z + fz * STAND_DISTANCE];
            const walk = findPath(grid, from, stand) ?? [from, stand];
            const book: Point3 = [
                shelf.x + fx * (SHELF_DEPTH / 2 + 0.05),
                tierIndex * TIER_HEIGHT + TIER_HEIGHT / 2 + PLANK / 2,
                shelf.z + fz * (SHELF_DEPTH / 2 + 0.05),
            ];
            points.push(...lift(walk), book);
            destination = { index, position: book };

            const row = shelf.tiers[tierIndex].row;
            const sections = shelf.sections.map(section => section.name).join(', ');
            steps.push(`Walk to ${shelf.shelf.name}${sections ? ` (${sections})` : ''} and find ${row.name}.`);
        }

        segments.push({ index, points });
    }

    return {
        segments,
        entrance,
        destination: destination!,
        steps,
        distance: segments.reduce((total, segment) => total + length(segment.points), 0),
    };
}
