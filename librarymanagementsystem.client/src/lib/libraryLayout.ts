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
export const BACK_STRIP = 3.4;
export const FRONT_STRIP = 2.8;
/** Extra depth a quarter needs when its wing is a reading room, for the tables and chairs at its outer end. */
const READING_ROOM_DEPTH = 2.8;
/** The hall is a square at least this big, so that each quarter of it (a wing) is a cube at least 11 across. */
export const MIN_HALL = 22;
const DEFAULT_WINGS = 4;
/** The order shelves are shared out to four wings: opposite quarters first, so even a few shelves spread across the hall. */
const WING_ORDER = [0, 3, 1, 2];

/**
 * A wing: one quarter of the hall, as the carpet cross divides it (a floor with 2 wings has the north and south halves instead).
 * Shelves are shared out evenly between the wings.
 */
export interface WingLayout {
    /** 0 to 3: north-west, north-east, south-west, south-east (with 2 wings: the north half, then the south half). */
    index: number;
    /** ReadingRoom if a reading-room section's shelf stands here (tables and chairs are added), else Wing if a wing section's does, else None. */
    model: SectionModel;
    /** The sections with a wing or reading room model whose shelves stand in this wing. */
    sections: Section[];
    /** The quarters of the hall that belong to this wing. */
    quarters: number[];
}

export interface TierLayout {
    row: Row;
    books: Book[];
}

export interface ShelfLayout {
    shelf: Shelf;
    /** Centre of the shelf on its floor. */
    x: number;
    z: number;
    /** Bottom tier first. The first row (by name) is the top tier, like reading down a shelf. */
    tiers: TierLayout[];
    sections: Section[];
    height: number;
}

export interface FloorLayout {
    floor: Floor;
    /** 0 for the bottom floor, 1 for the one above it, and so on. */
    level: number;
    shelves: ShelfLayout[];
    /** 2 or 4 wings. */
    wings: WingLayout[];
    /** Side of the square hall this floor's shelves need; the building uses the biggest. */
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
export const QUARTERS = [
    { sx: -1, sz: -1 },
    { sx: 1, sz: -1 },
    { sx: -1, sz: 1 },
    { sx: 1, sz: 1 },
] as const;

/** The floor of one quarter of a hall `hall` across, from the aisles of the cross to the strips by the walls: centre and half sizes. */
export function quarterRect(hall: number, quarter: number) {
    const { sx, sz } = QUARTERS[quarter];
    const inner = CROSS_GAP / 2;
    const outerX = hall / 2 - (sx < 0 ? LOBBY_WIDTH : 0.8);
    const outerZ = hall / 2 - (sz < 0 ? BACK_STRIP : FRONT_STRIP);
    return { x: (sx * (inner + outerX)) / 2, z: (sz * (inner + outerZ)) / 2, hx: (outerX - inner) / 2, hz: (outerZ - inner) / 2 };
}

/** The floor of a whole wing: its quarter, or the two quarters of a half. */
export function wingRect(hall: number, wing: WingLayout) {
    const rects = wing.quarters.map(quarter => quarterRect(hall, quarter));
    const minX = Math.min(...rects.map(r => r.x - r.hx));
    const maxX = Math.max(...rects.map(r => r.x + r.hx));
    const minZ = Math.min(...rects.map(r => r.z - r.hz));
    const maxZ = Math.max(...rects.map(r => r.z + r.hz));
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, hx: (maxX - minX) / 2, hz: (maxZ - minZ) / 2 };
}

/** Side of the square hall that fits `columns` x `rows` shelves in each quarter (stood back from the cross). */
function hallSide(columns: number, rows: number, extraDepth: number): number {
    const reachX = CROSS_GAP / 2 + columns * CELL_X;
    const reachZ = CROSS_GAP / 2 + rows * CELL_Z + extraDepth;
    return Math.max(MIN_HALL, 2 * (reachX + LOBBY_WIDTH), 2 * reachX, 2 * (reachZ + BACK_STRIP), 2 * (reachZ + FRONT_STRIP));
}

/**
 * Arranges every floor's shelves in the quarters of the hall the carpet cross leaves (shared out evenly between the floor's
 * wings) and puts each book on the tiers (rows) it is assigned to.
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

    return [...floors].sort(byLevel).map((floor, level) => {
        const floorShelves = shelves.filter(s => s.floorId === floor.id).sort(byName);

        // Every floor has 2 or 4 wings: the four quarters of the hall, or its north and south halves.
        const wingCount = floor.wings === 2 ? 2 : DEFAULT_WINGS;
        const quartersOf = (wing: number) => (wingCount === 4 ? [wing] : [wing * 2, wing * 2 + 1]);
        /** The wing the n-th shelf goes to: the wings in turn, as spread out as possible. */
        const wingOf = (n: number) => (wingCount === 4 ? WING_ORDER[n % 4] : n % 2);

        // The same number of columns and rows in every quarter, so the hall stays symmetrical around the cross.
        const perQuarter = Math.ceil(floorShelves.length / 4);
        const columns = Math.max(1, Math.ceil(Math.sqrt(perQuarter)));
        const gridRows = Math.max(1, Math.ceil(perQuarter / columns));

        const shelfLayouts = floorShelves.map<ShelfLayout>((shelf, index) => {
            // Shelves go to the wings in turn; inside a half they alternate between its two quarters.
            const wing = wingOf(index);
            const turn = Math.floor(index / wingCount);
            const quarters = quartersOf(wing);
            const { sx, sz } = QUARTERS[quarters[turn % quarters.length]];
            const slot = Math.floor(turn / quarters.length);
            const column = slot % columns;
            const row = Math.floor(slot / columns);

            const shelfRows = rows.filter(r => r.shelfId === shelf.id).sort(byName);
            const tiers = shelfRows
                .map<TierLayout>(shelfRow => ({ row: shelfRow, books: booksByRow.get(shelfRow.id) ?? [] }))
                .reverse();

            return {
                shelf,
                // Cells are counted outwards from the cross, so the aisles of the cross stay clear however the hall grows.
                x: sx * (CROSS_GAP / 2 + (column + 0.5) * CELL_X),
                z: sz * (CROSS_GAP / 2 + (row + 0.5) * CELL_Z),
                tiers,
                sections: sections.filter(s => s.shelfId === shelf.id),
                height: Math.max(1, tiers.length) * TIER_HEIGHT + PLANK,
            };
        });

        // A wing with a wing or reading room section's shelf takes that model, and the sections' names.
        const wings = Array.from({ length: wingCount }, (_, index): WingLayout => {
            const shelfIds = new Set(floorShelves.filter((_, i) => wingOf(i) === index).map(shelf => shelf.id));
            const named = sections
                .filter(s => s.floorId === floor.id && s.model !== SectionModel.None && shelfIds.has(s.shelfId))
                .sort(byName);
            const model = named.some(s => s.model === SectionModel.ReadingRoom)
                ? SectionModel.ReadingRoom
                : named.length > 0
                  ? SectionModel.Wing
                  : SectionModel.None;
            return { index, model, sections: named, quarters: quartersOf(index) };
        });

        const side = hallSide(columns, gridRows, wings.some(w => w.model === SectionModel.ReadingRoom) ? READING_ROOM_DEPTH : 0);

        return {
            floor,
            level,
            shelves: shelfLayouts,
            wings,
            width: side,
            depth: side,
            height: shelfLayouts.reduce((max, s) => Math.max(max, s.height), TIER_HEIGHT * 2),
        };
    });
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
