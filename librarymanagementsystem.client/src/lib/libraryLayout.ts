import { SectionModel } from '../api/resources.ts';
import type { Book, Floor, Row, Section, Shelf } from '../api/resources.ts';

// World units for the 3D map (roughly metres).
export const SHELF_WIDTH = 3;
export const SHELF_DEPTH = 0.9;
export const TIER_HEIGHT = 0.75;
export const PLANK = 0.06;

const AISLE_X = 1.4;
const AISLE_Z = 2.8;
const MAX_COLUMNS = 4;
/** Extra space between the two halves of the stacks, kept clear for the walkway from the main door (in the middle of the left wall). */
export const WALKWAY_GAP = 1.4;
/** Where a reading room's shelf stands, measured from the middle of the floor depth towards the back wall. */
const READING_ROOM_SHELF_Z = -1.2;
const FLOOR_MARGIN = 1.5;
/** Strip along the left wall of every floor, kept clear of shelves for the stairs. */
export const STAIR_ZONE = 2;

/** Width of the room a section adds to the right of its floor, by model. */
const EXTENSION_WIDTHS: Record<Exclude<SectionModel, typeof SectionModel.None>, number> = {
    [SectionModel.Wing]: 7,
    [SectionModel.ReadingRoom]: 8,
};

/** A wing or reading room that extends a floor to the right, next to the main floor. */
export interface ExtensionLayout {
    section: Section;
    model: SectionModel;
    /** Distance from the main floor's right wall to the near edge of this room. */
    offset: number;
    width: number;
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
    /** The room the shelf stands in; its x is then measured from that room's centre. Null on the main floor. */
    extension: ExtensionLayout | null;
}

export interface FloorLayout {
    floor: Floor;
    /** 0 for the bottom floor, 1 for the one above it, and so on. */
    level: number;
    /** Every shelf on the floor, including those in wings and reading rooms. */
    shelves: ShelfLayout[];
    /** Wings and reading rooms, nearest the main floor first. */
    extensions: ExtensionLayout[];
    /** Total width the extensions add to the right of the main floor. */
    extensionWidth: number;
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

    return [...floors].sort(byLevel).map((floor, level) => {
        const allShelves = shelves.filter(s => s.floorId === floor.id).sort(byName);

        // Each wing or reading room is built for a section; the section's shelf moves into it.
        const extensions: ExtensionLayout[] = [];
        const extensionOf = new Map<string, ExtensionLayout>();
        for (const section of sections.filter(s => s.floorId === floor.id && s.model !== SectionModel.None).sort(byName)) {
            const width = EXTENSION_WIDTHS[section.model as keyof typeof EXTENSION_WIDTHS];
            const offset = extensions.reduce((sum, e) => sum + e.width, 0);
            const extension: ExtensionLayout = { section, model: section.model, offset, width };
            extensions.push(extension);
            if (!extensionOf.has(section.shelfId)) extensionOf.set(section.shelfId, extension);
        }

        const floorShelves = allShelves.filter(s => !extensionOf.has(s.id));
        // An even number of grid rows, so the walkway from the main door runs between two of them.
        let columns = Math.max(1, Math.min(MAX_COLUMNS, Math.ceil(Math.sqrt(floorShelves.length))));
        let gridRows = Math.max(1, Math.ceil(floorShelves.length / columns));
        if (floorShelves.length > 0) {
            gridRows += gridRows % 2;
            columns = Math.min(MAX_COLUMNS, Math.ceil(floorShelves.length / gridRows));
        }

        const makeShelf = (shelf: Shelf, x: number, z: number, extension: ExtensionLayout | null): ShelfLayout => {
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
                extension,
            };
        };

        const mainShelves = floorShelves.map((shelf, index) => {
            const column = index % columns;
            const gridRow = Math.floor(index / columns);
            return makeShelf(
                shelf,
                // The stairs take the strip along the left wall, so the stacks sit to the right of it.
                (column - (columns - 1) / 2) * (SHELF_WIDTH + AISLE_X) + STAIR_ZONE / 2,
                (gridRow - (gridRows - 1) / 2) * (SHELF_DEPTH + AISLE_Z) + (gridRow < gridRows / 2 ? -1 : 1) * (WALKWAY_GAP / 2),
                null,
            );
        });
        // A wing keeps its shelf in the middle; a reading room pushes it towards the back, leaving the front for tables.
        const extensionShelves = allShelves
            .filter(shelf => extensionOf.has(shelf.id))
            .map(shelf => {
                const extension = extensionOf.get(shelf.id)!;
                return makeShelf(shelf, 0, extension.model === SectionModel.ReadingRoom ? READING_ROOM_SHELF_Z : 0, extension);
            });
        const shelfLayouts = [...mainShelves, ...extensionShelves];

        return {
            floor,
            level,
            shelves: shelfLayouts,
            extensions,
            extensionWidth: extensions.reduce((sum, e) => sum + e.width, 0),
            width: Math.max(9, columns * (SHELF_WIDTH + AISLE_X) + FLOOR_MARGIN + STAIR_ZONE),
            depth: Math.max(7, gridRows * (SHELF_DEPTH + AISLE_Z) + (gridRows > 1 ? WALKWAY_GAP : 0) + FLOOR_MARGIN),
            height: shelfLayouts.reduce((max, s) => Math.max(max, s.height), TIER_HEIGHT * 2),
        };
    });
}

/** X of the middle of a room that extends a floor whose main part is `width` wide. */
export const extensionCenterX = (width: number, extension: ExtensionLayout) => width / 2 + extension.offset + extension.width / 2;

/** X of a shelf in the floor's own space, wherever it stands. */
export const shelfWorldX = (shelf: ShelfLayout, width: number) =>
    shelf.extension ? extensionCenterX(width, shelf.extension) + shelf.x : shelf.x;

/** Stable pseudo-random number in [0, 1) from a string, so a book keeps its look between renders. */
export function hash01(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}
