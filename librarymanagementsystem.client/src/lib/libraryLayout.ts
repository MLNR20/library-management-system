import { SectionModel } from '../api/resources.ts';
import type { Book, Floor, Row, Section, Shelf } from '../api/resources.ts';

// World units for the 3D map (roughly metres).
export const SHELF_WIDTH = 3;
export const SHELF_DEPTH = 0.9;
export const TIER_HEIGHT = 0.75;
export const PLANK = 0.06;

/** Floor space one shelf takes: the shelf plus the aisle beside it (x) or in front of it (z). */
export const CELL_X = SHELF_WIDTH + 1.4;
export const CELL_Z = SHELF_DEPTH + 2.8;
/** Width of the aisle down each arm of the carpet cross; the stacks stand back from the cross by half of it. */
export const CROSS_GAP = 2.4;
/** Strip along the left (west) wall by the main door, kept clear of shelves. */
export const LOBBY_WIDTH = 2;
/** Strips along the back wall (north door, librarian's desk) and the front edge (tables, columns) kept clear of shelves. */
const BACK_STRIP = 3.4;
const FRONT_STRIP = 2.8;
/** The hall is a square at least this big, so that each wing (half the hall's side) is a cube at least 11 across. */
export const MIN_HALL = 22;
/** Where a reading room's shelves stand, measured from the middle of its room towards the back wall. */
const READING_ROOM_SHELF_Z = -3;
const WING_MARGIN = 1.5;
const DEFAULT_WINGS = 4;

/**
 * A wing: a cube-sized room beside the hall. Wings come in pairs (north and south of the carpet's east arm), a pair at a time
 * going east, so a floor has 2 or 4 of them. Every floor of the building is widened to fit the widest set of wings.
 */
export interface WingLayout {
    /** 0 and 1 are the north and south wing of the first pair, 2 and 3 those of the second pair. */
    index: number;
    /** Wing (shelves in the room), ReadingRoom (tables and chairs, shelves along the back) or None (an empty wing). */
    model: SectionModel;
    /** The sections whose shelves stand in this wing. */
    sections: Section[];
}

export interface TierLayout {
    row: Row;
    books: Book[];
}

export interface ShelfLayout {
    shelf: Shelf;
    /** Centre of the shelf in the hall, or measured from the centre of its wing when it stands in one. */
    x: number;
    z: number;
    /** Bottom tier first. The first row (by name) is the top tier, like reading down a shelf. */
    tiers: TierLayout[];
    sections: Section[];
    height: number;
    /** The wing the shelf stands in; null when it stands in the hall. */
    wing: WingLayout | null;
}

export interface FloorLayout {
    floor: Floor;
    /** 0 for the bottom floor, 1 for the one above it, and so on. */
    level: number;
    /** Every shelf on the floor, including those in wings. */
    shelves: ShelfLayout[];
    wings: WingLayout[];
    /** Columns of wings (pairs) the building's widest floor has: every floor is widened by that many wings' width. */
    wingColumns: number;
    /** Side of the square hall this floor's shelves and wings need; the building uses the biggest. */
    width: number;
    depth: number;
    /** Height of the tallest shelf. */
    height: number;
}

interface LayoutInput {
    floors: Floor[];
    shelves: Shelf[];
    rows: Row[];
    sections: Section[];
    books: Book[];
}

const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

/** Where a floor sits in the building, guessed from its name: basement, ground, first, second, "level 3"... */
function floorRank(name: string): number {
    const text = name.toLowerCase();
    if (/basement|cellar|lower/.test(text)) return -1;
    if (/ground|lobby|entrance/.test(text)) return 0;
    const ordinal = ORDINALS.findIndex(word => text.includes(word));
    if (ordinal >= 0) return ordinal + 1;
    const digits = /\d+/.exec(text);
    return digits ? Number(digits[0]) : 100;
}

/** Bottom floor first. Falls back to name order for floors whose names say nothing about their level. */
const byLevel = (a: { name: string }, b: { name: string }) => floorRank(a.name) - floorRank(b.name) || byName(a, b);

/** The four quarters of the hall the carpet cross makes: north-west, north-east, south-west, south-east. */
const QUARTERS = [
    { sx: -1, sz: -1 },
    { sx: 1, sz: -1 },
    { sx: -1, sz: 1 },
    { sx: 1, sz: 1 },
] as const;

/** Side of the square hall that fits `columns` x `rows` shelves in each quarter (stood back from the cross). */
function hallSide(columns: number, rows: number): number {
    const reachX = CROSS_GAP / 2 + columns * CELL_X;
    const reachZ = CROSS_GAP / 2 + rows * CELL_Z;
    return Math.max(MIN_HALL, 2 * (reachX + LOBBY_WIDTH), 2 * reachX, 2 * (reachZ + BACK_STRIP), 2 * (reachZ + FRONT_STRIP));
}

/** Where `count` shelves stand inside a wing, measured from its centre: two to a row. */
function wingSlots(count: number, model: SectionModel): { x: number; z: number }[] {
    const columns = Math.min(2, Math.max(1, count));
    const rows = Math.ceil(count / columns);
    return Array.from({ length: count }, (_, i) => {
        const column = i % columns;
        const row = Math.floor(i / columns);
        return {
            x: (column - (columns - 1) / 2) * CELL_X,
            // A reading room keeps its shelves against the back wall, leaving the rest for tables.
            z: model === SectionModel.ReadingRoom ? READING_ROOM_SHELF_Z + row * CELL_Z : (row - (rows - 1) / 2) * CELL_Z,
        };
    });
}

/**
 * Arranges every floor's shelves in the four quarters the carpet cross leaves in the hall (or in a wing, for sections that
 * have a wing or reading room) and puts each book on the tiers (rows) it is assigned to.
 */
export function buildLayout({ floors, shelves, rows, sections, books }: LayoutInput): FloorLayout[] {
    const booksByRow = new Map<string, Book[]>();
    for (const book of books) {
        for (const row of book.rows) {
            const list = booksByRow.get(row.id);
            if (list) list.push(book);
            else booksByRow.set(row.id, [book]);
        }
    }

    const layouts = [...floors].sort(byLevel).map((floor, level) => {
        const allShelves = shelves.filter(s => s.floorId === floor.id).sort(byName);

        // Every floor has 2 or 4 wings. The sections with a wing model put their shelves in the first wing, the ones with a
        // reading room in the second; the rest stand empty.
        const wingCount = floor.wings === 2 ? 2 : DEFAULT_WINGS;
        const wings: WingLayout[] = Array.from({ length: wingCount }, (_, index) => ({ index, model: SectionModel.None, sections: [] }));
        const wingOf = new Map<string, { wing: WingLayout; index: number; count: number }>();
        for (const [model, wing] of [
            [SectionModel.Wing, wings[0]],
            [SectionModel.ReadingRoom, wings[1]],
        ] as const) {
            const group = sections.filter(s => s.floorId === floor.id && s.model === model).sort(byName);
            if (group.length === 0) continue;
            wing.model = model;
            wing.sections = group;
            const shelfIds = [...new Set(group.map(s => s.shelfId))].filter(id => allShelves.some(shelf => shelf.id === id));
            shelfIds.forEach((id, index) => wingOf.set(id, { wing, index, count: shelfIds.length }));
        }

        const hallShelves = allShelves.filter(s => !wingOf.has(s.id));
        // The same number of columns and rows in every quarter, so the hall stays symmetrical around the cross.
        const perQuarter = Math.ceil(hallShelves.length / 4);
        const columns = Math.max(1, Math.ceil(Math.sqrt(perQuarter)));
        const gridRows = Math.max(1, Math.ceil(perQuarter / columns));

        const makeShelf = (shelf: Shelf, x: number, z: number, wing: WingLayout | null): ShelfLayout => {
            const shelfRows = rows.filter(r => r.shelfId === shelf.id).sort(byName);
            const tiers = shelfRows
                .map<TierLayout>(row => ({ row, books: booksByRow.get(row.id) ?? [] }))
                .reverse();

            return {
                shelf,
                x,
                z,
                tiers,
                sections: sections.filter(s => s.shelfId === shelf.id),
                height: Math.max(1, tiers.length) * TIER_HEIGHT + PLANK,
                wing,
            };
        };

        const hallLayouts = hallShelves.map((shelf, index) => {
            const { sx, sz } = QUARTERS[index % 4];
            const slot = Math.floor(index / 4);
            const column = slot % columns;
            const row = Math.floor(slot / columns);
            // Cells are counted outwards from the cross, so the aisles of the cross stay clear however the hall grows.
            return makeShelf(
                shelf,
                sx * (CROSS_GAP / 2 + (column + 0.5) * CELL_X),
                sz * (CROSS_GAP / 2 + (row + 0.5) * CELL_Z),
                null,
            );
        });

        let wingNeed = 0;
        const wingLayouts: ShelfLayout[] = [];
        for (const wing of wings) {
            const ids = allShelves.filter(s => wingOf.get(s.id)?.wing === wing);
            if (ids.length === 0) continue;
            const slots = wingSlots(ids.length, wing.model);
            ids.forEach((shelf, i) => wingLayouts.push(makeShelf(shelf, slots[i].x, slots[i].z, wing)));
            // A wing is half the hall wide and deep, so a crowded wing makes the hall (and every wing) bigger.
            const wingColumns = Math.min(2, ids.length);
            const wingRows = Math.ceil(ids.length / wingColumns);
            wingNeed = Math.max(wingNeed, wingColumns * CELL_X + WING_MARGIN, wingRows * CELL_Z + WING_MARGIN);
        }

        const shelfLayouts = [...hallLayouts, ...wingLayouts];
        const side = Math.max(hallSide(columns, gridRows), wingNeed * 2);

        return {
            floor,
            level,
            shelves: shelfLayouts,
            wings,
            wingColumns: wingCount / 2,
            width: side,
            depth: side,
            height: shelfLayouts.reduce((max, s) => Math.max(max, s.height), TIER_HEIGHT * 2),
        };
    });

    // Wings are part of the building: they widen every floor, with their furnishings and shelves only where they are assigned.
    const columns = Math.max(0, ...layouts.map(layout => layout.wingColumns));
    return layouts.map(layout => ({ ...layout, wingColumns: columns }));
}

/** Centre and side of a wing in a building whose square hall is `hall` across; wings are cubes half the hall's side. */
export function wingCenter(hall: number, index: number) {
    const size = hall / 2;
    return { x: hall / 2 + (Math.floor(index / 2) + 0.5) * size, z: (index % 2 === 0 ? -1 : 1) * (size / 2), size };
}

/** How far the wings reach past the east edge of the hall. */
export const floorReach = (layout: FloorLayout, hall: number) => layout.wingColumns * (hall / 2);

/** Where a shelf stands on its floor, wherever it is. */
export function shelfWorld(shelf: ShelfLayout, hall: number): { x: number; z: number } {
    if (!shelf.wing) return { x: shelf.x, z: shelf.z };
    const centre = wingCenter(hall, shelf.wing.index);
    return { x: centre.x + shelf.x, z: centre.z + shelf.z };
}

/** Stable pseudo-random number in [0, 1) from a string, so a book keeps its look between renders. */
export function hash01(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}
