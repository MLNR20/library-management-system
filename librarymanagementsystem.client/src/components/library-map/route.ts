import { PLANK, SHELF_DEPTH, SHELF_WIDTH, TIER_HEIGHT, floorReach, shelfWorld } from '../../lib/libraryLayout.ts';
import type { FloorLayout, ShelfLayout } from '../../lib/libraryLayout.ts';
import { buildGrid, findPath } from '../../lib/pathfinding.ts';
import type { Box, Point2 } from '../../lib/pathfinding.ts';
import { STAIR_EDGE, STAIR_LANDING, entrancePoint, flightFrame, furnitureRects, stairGeometry } from './floorPlan.ts';

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

function shelfBox(shelf: ShelfLayout, x: number, z: number): Box {
    const quarterTurn = shelf.shelf.rotation === 90;
    return {
        x,
        z,
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

/** A book can sit in several rows; walk to the one on the lowest floor, the nearest to the door. */
export function routeRowFor(rowIds: string[], layouts: FloorLayout[]): string | null {
    const levelOf = (rowId: string) =>
        layouts.find(layout => layout.shelves.some(shelf => shelf.tiers.some(tier => tier.row.id === rowId)))?.level ?? Infinity;
    const nearest = [...rowIds].sort((a, b) => levelOf(a) - levelOf(b))[0];
    return nearest !== undefined && levelOf(nearest) !== Infinity ? nearest : null;
}

/**
 * Plans the walk from the main door to a row: along the carpet to the stairs that face the door and up them when the row
 * is on a higher floor, then to the front of its shelf. `floors` are the floors being drawn (bottom first), sharing one
 * square hall `width` across (`depth` is the same) and one `storey` height. Returns null when the row is not on any of them.
 */
export function buildRoute(floors: FloorLayout[], rowId: string, width: number, depth: number, storey: number): Route | null {
    const targetIndex = floors.findIndex(floor => floor.shelves.some(shelf => shelf.tiers.some(tier => tier.row.id === rowId)));
    if (targetIndex < 0) return null;

    const { count, rise, run } = stairGeometry(storey);
    const { length: flight, centre } = flightFrame(width, storey);
    // Every flight faces the door: it starts at the west end of the stairs and climbs east, along the middle of the floor (z = 0).
    const footX = centre - (flight / 2 - STAIR_EDGE);
    const topX = centre + (flight / 2 - STAIR_LANDING / 2);

    const segments: RouteSegment[] = [];
    const steps: string[] = [];
    let entrance: Route['entrance'] = null;
    let destination: Route['destination'] | null = null;

    for (let index = 0; index <= targetIndex; index++) {
        const floor = floors[index];
        // The wings widen the floor to the east.
        const reach = floorReach(floor, width);
        const grid = buildGrid(
            width + reach,
            depth,
            [
                ...floor.shelves.map(shelf => {
                    const at = shelfWorld(shelf, width);
                    return shelfBox(shelf, at.x, at.z);
                }),
                ...furnitureRects(width, floor.level === 0, floor.wings, storey),
            ],
            CLEARANCE,
            0.25,
            reach / 2,
        );

        let from: Point2;
        if (index === 0 && floor.level === 0) {
            const door = entrancePoint(width);
            from = [door.x, door.z];
            entrance = { index, position: [door.x, WALK_HEIGHT, door.z] };
            steps.push(`Come in through the main door in the left wall of the ${floor.floor.name.toLowerCase()}; the stairs face it at the far end of the red carpet.`);
        } else if (index === 0) {
            from = [footX - 0.6, 0];
        } else {
            // Arrived from the flight below, on the landing at its far end.
            from = [topX, 0];
        }

        const points: Point3[] = [];

        if (index < targetIndex) {
            // Walk to the foot of the flight, which faces the door, and climb it.
            const foot: Point2 = [footX - 0.6, 0];
            const walk = findPath(grid, from, foot) ?? [from, foot];
            points.push(...lift(index > 0 ? [from, ...walk] : walk));
            points.push([footX, WALK_HEIGHT, 0]);
            for (let step = 0; step < count; step++) {
                points.push([footX + (step + 0.5) * run, (step + 1) * rise + WALK_HEIGHT, 0]);
            }
            points.push([topX, storey + WALK_HEIGHT, 0]);
            steps.push(`Take the stairs up to the ${floors[index + 1].floor.name.toLowerCase()}.`);
        } else {
            const shelf = floor.shelves.find(s => s.tiers.some(tier => tier.row.id === rowId))!;
            const tierIndex = shelf.tiers.findIndex(tier => tier.row.id === rowId);
            const [fx, fz] = facing(shelf);
            const at = shelfWorld(shelf, width);
            const stand: Point2 = [at.x + fx * STAND_DISTANCE, at.z + fz * STAND_DISTANCE];
            const walk = findPath(grid, from, stand) ?? [from, stand];
            const book: Point3 = [
                at.x + fx * (SHELF_DEPTH / 2 + 0.05),
                tierIndex * TIER_HEIGHT + TIER_HEIGHT / 2 + PLANK / 2,
                at.z + fz * (SHELF_DEPTH / 2 + 0.05),
            ];
            points.push(...lift(index > 0 ? [from, ...walk] : walk), book);
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
