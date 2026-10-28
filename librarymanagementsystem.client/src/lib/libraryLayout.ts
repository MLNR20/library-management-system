import type { Book, Floor, Row, Section, Shelf } from '../api/resources.ts';

// World units for the 3D map (roughly metres).
export const SHELF_WIDTH = 3;
export const SHELF_DEPTH = 0.9;
export const TIER_HEIGHT = 0.75;
export const PLANK = 0.06;

const AISLE_X = 1.4;
const AISLE_Z = 2.8;
const MAX_COLUMNS = 4;
const FLOOR_MARGIN = 1.5;

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
    shelves: ShelfLayout[];
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

/** Arranges every floor's shelves in an auto grid and puts each book on the tiers (rows) it is assigned to. */
export function buildLayout({ floors, shelves, rows, sections, books }: LayoutInput): FloorLayout[] {
    const booksByRow = new Map<string, Book[]>();
    for (const book of books) {
        for (const row of book.rows) {
            const list = booksByRow.get(row.id);
            if (list) list.push(book);
            else booksByRow.set(row.id, [book]);
        }
    }

    return [...floors].sort(byName).map(floor => {
        const floorShelves = shelves.filter(s => s.floorId === floor.id).sort(byName);
        const columns = Math.max(1, Math.min(MAX_COLUMNS, Math.ceil(Math.sqrt(floorShelves.length))));
        const gridRows = Math.max(1, Math.ceil(floorShelves.length / columns));

        const shelfLayouts = floorShelves.map<ShelfLayout>((shelf, index) => {
            const column = index % columns;
            const gridRow = Math.floor(index / columns);
            const shelfRows = rows.filter(r => r.shelfId === shelf.id).sort(byName);
            const tiers = shelfRows
                .map<TierLayout>(row => ({ row, books: booksByRow.get(row.id) ?? [] }))
                .reverse();

            return {
                shelf,
                x: (column - (columns - 1) / 2) * (SHELF_WIDTH + AISLE_X),
                z: (gridRow - (gridRows - 1) / 2) * (SHELF_DEPTH + AISLE_Z),
                tiers,
                sections: sections.filter(s => s.shelfId === shelf.id),
                height: Math.max(1, tiers.length) * TIER_HEIGHT + PLANK,
            };
        });

        return {
            floor,
            shelves: shelfLayouts,
            width: Math.max(9, columns * (SHELF_WIDTH + AISLE_X) + FLOOR_MARGIN),
            depth: Math.max(7, gridRows * (SHELF_DEPTH + AISLE_Z) + FLOOR_MARGIN),
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
