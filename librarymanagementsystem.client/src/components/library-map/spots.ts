import { SectionModel } from '../../api/resources.ts';
import type { Section } from '../../api/resources.ts';
import type { StudyTable } from '../../api/tables.ts';
import { QUARTERS, STUDY_ROOM_DEPTH } from '../../lib/libraryLayout.ts';
import type { FloorLayout, WingLayout } from '../../lib/libraryLayout.ts';
import { STUDY_TABLE_Z, STUDY_TV_HEIGHT, STUDY_WALL, TABLE_HEIGHT, readingTables, studyPoint, studyRooms } from './floorPlan.ts';
import type { Point3, Spot } from './route.ts';
import type { Point2 } from '../../lib/pathfinding.ts';

// Where a reader is taken for a table or a reading room. A reading room is the wing its section's shelf stands in; the
// wing is furnished with tables, two in each quarter. The tables in the database are not drawn one by one, so a room's
// tables are matched to its drawn tables in name order.

const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

interface DrawnTable {
    /** The top of the table, to look at. */
    look: Point3;
    /** Where to stand to look at it. For open tables: the gap between the two tables of its quarter, which is always clear. For a study room: just inside the door. */
    stand: Point2;
    /** What to face on arriving at the room as a whole: the table, or in a study room the TV on the wall. */
    roomLook: Point3;
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
        const wing = layout.wings.find(
            w => (w.model === SectionModel.ReadingRoom || w.model === SectionModel.StudyRoom) && w.sections.some(s => s.id === sectionId),
        );
        if (!wing) continue;
        const tables =
            wing.model === SectionModel.StudyRoom
                ? studyRooms(hall, wing).map<DrawnTable>(room => {
                      const [tableX, tableZ] = studyPoint(room, 0, STUDY_TABLE_Z);
                      const [tvX, tvZ] = studyPoint(room, 0, -STUDY_ROOM_DEPTH / 2 + STUDY_WALL + 0.05);
                      return {
                          look: [tableX, TABLE_HEIGHT, tableZ],
                          stand: studyPoint(room, 0, STUDY_ROOM_DEPTH / 2 - 0.7),
                          roomLook: [tvX, STUDY_TV_HEIGHT, tvZ],
                      };
                  })
                : readingTables(hall, wing).flatMap(({ z, xs }) =>
                      xs.map<DrawnTable>(x => ({
                          look: [x, TABLE_HEIGHT, z],
                          stand: [(xs[0] + xs[xs.length - 1]) / 2, z],
                          roomLook: [x, TABLE_HEIGHT, z],
                      })),
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

/** Stand where the table's spot says and look at `look`. */
function spotFor(place: RoomPlace, table: DrawnTable, look: Point3, step: string): Spot {
    return { index: place.index, look, stand: table.stand, step };
}

const kindOf = (place: RoomPlace) => (place.wing.model === SectionModel.StudyRoom ? 'study room' : 'reading room');

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
        drawn.look,
        `Walk to ${table.name} in ${table.sectionName ?? `the ${kindOf(place)}`}, in ${whereIn(place.wing)} of the ${place.layout.floor.name.toLowerCase()}.`,
    );
}

/** Where to go for a reading room: in among its tables. Null when the room has no wing on the map. */
export function roomSpot(layouts: FloorLayout[], hall: number, room: Section): Spot | null {
    const place = placeOf(layouts, hall, room.id);
    if (!place) return null;

    return spotFor(
        place,
        place.tables[0],
        place.tables[0].roomLook,
        `Walk into ${room.name}, the ${kindOf(place)} in ${whereIn(place.wing)} of the ${place.layout.floor.name.toLowerCase()}.`,
    );
}
