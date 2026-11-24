import { SectionModel } from '../../api/resources.ts';
import type { Section } from '../../api/resources.ts';
import type { StudyTable } from '../../api/tables.ts';
import { QUARTERS } from '../../lib/libraryLayout.ts';
import type { FloorLayout, WingLayout } from '../../lib/libraryLayout.ts';
import { TABLE_HEIGHT, readingTables } from './floorPlan.ts';
import type { Spot } from './route.ts';

// Where a reader is taken for a table or a reading room. A reading room is the wing its section's shelf stands in; the
// wing is furnished with tables, two in each quarter. The tables in the database are not drawn one by one, so a room's
// tables are matched to its drawn tables in name order.

const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

interface DrawnTable {
    x: number;
    z: number;
    /** The quarter of the hall it stands in. */
    quarter: number;
    /** Where to stand to look at it: the gap between the two tables of its quarter, which is always clear. */
    gapX: number;
}

interface RoomPlace {
    index: number;
    layout: FloorLayout;
    wing: WingLayout;
    /** The drawn tables, in order. */
    tables: DrawnTable[];
}

/** The floor and wing a reading room stands in, with the tables drawn there. Null when the room has no wing on the map. */
function placeOf(layouts: FloorLayout[], hall: number, sectionId: string): RoomPlace | null {
    for (const [index, layout] of layouts.entries()) {
        const wing = layout.wings.find(w => w.model === SectionModel.ReadingRoom && w.sections.some(s => s.id === sectionId));
        if (!wing) continue;
        const tables = readingTables(hall, wing).flatMap(({ z, xs }, at) =>
            xs.map<DrawnTable>(x => ({ x, z, quarter: wing.quarters[at], gapX: (xs[0] + xs[xs.length - 1]) / 2 })),
        );
        return tables.length > 0 ? { index, layout, wing, tables } : null;
    }
    return null;
}

/** "the north-west quarter" or, for a floor with two wings, "the north half". */
function whereIn(wing: WingLayout): string {
    const { sx, sz } = QUARTERS[wing.quarters[0]];
    const north = sz < 0 ? 'north' : 'south';
    return wing.quarters.length > 1 ? `the ${north} half` : `the ${north}-${sx < 0 ? 'west' : 'east'} quarter`;
}

/** Stand in the gap between the tables of the quarter and look down at a table's top. */
function spotFor(place: RoomPlace, table: DrawnTable, step: string): Spot {
    return {
        index: place.index,
        look: [table.x, TABLE_HEIGHT, table.z],
        stand: [table.gapX, table.z],
        step,
    };
}

/** Where to go for a table: a table of its reading room, the same one every time. Null when it is not in a reading room on the map. */
export function tableSpot(layouts: FloorLayout[], hall: number, table: StudyTable, allTables: StudyTable[]): Spot | null {
    if (!table.sectionId) return null;
    const place = placeOf(layouts, hall, table.sectionId);
    if (!place) return null;

    const beside = allTables.filter(t => t.sectionId === table.sectionId).sort(byName);
    const drawn = place.tables[Math.max(0, beside.findIndex(t => t.id === table.id)) % place.tables.length];
    return spotFor(
        place,
        drawn,
        `Walk to ${table.name} in ${table.sectionName ?? 'the reading room'}, in ${whereIn(place.wing)} of the ${place.layout.floor.name.toLowerCase()}.`,
    );
}

/** Where to go for a reading room: in among its tables. Null when the room has no wing on the map. */
export function roomSpot(layouts: FloorLayout[], hall: number, room: Section): Spot | null {
    const place = placeOf(layouts, hall, room.id);
    if (!place) return null;

    return spotFor(
        place,
        place.tables[0],
        `Walk into ${room.name}, the reading room in ${whereIn(place.wing)} of the ${place.layout.floor.name.toLowerCase()}.`,
    );
}
