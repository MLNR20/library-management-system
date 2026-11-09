import { SectionModel } from '../../api/resources.ts';
import type { Section } from '../../api/resources.ts';
import { useRoomReservations } from '../../api/rooms.ts';
import { ReservationStatus, tableHooks } from '../../api/tables.ts';

const timeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface Props {
    section: Section;
    /** "furnishing": its tables and seats. "bookings": whether it is reserved now or next, and how many requests wait. */
    part: 'furnishing' | 'bookings';
}

/**
 * A reading room's tables or reservations, for a cell of the Sections table. It reads its own data (shared with the other
 * cells through the query cache) so the table's columns can stay fixed. Any other kind of section shows a dash.
 */
export function RoomCell({ section, part }: Props) {
    const tables = tableHooks.useList().data;
    // "Now" is when the reservations were last fetched, which is every minute.
    const { data: reservations, dataUpdatedAt: now } = useRoomReservations();

    if (section.model !== SectionModel.ReadingRoom) return <span className="opacity-40">—</span>;

    if (part === 'furnishing') {
        const inRoom = (tables ?? []).filter(table => table.isActive && table.sectionId === section.id);
        const seats = inRoom.reduce((total, table) => total + table.seats, 0);
        return (
            <span>
                {inRoom.length} {inRoom.length === 1 ? 'table' : 'tables'} · {seats} {seats === 1 ? 'seat' : 'seats'}
            </span>
        );
    }

    const upcoming = (reservations ?? []).filter(
        r =>
            r.sectionId === section.id &&
            new Date(r.endUtc).getTime() > now &&
            (r.status === ReservationStatus.Approved || r.status === ReservationStatus.Pending),
    );
    const approved = upcoming.filter(r => r.status === ReservationStatus.Approved).sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    const waiting = upcoming.filter(r => r.status === ReservationStatus.Pending).length;
    const current = approved.find(r => new Date(r.startUtc).getTime() <= now);
    const next = approved.find(r => new Date(r.startUtc).getTime() > now);

    if (!current && !next && waiting === 0) return <span className="opacity-60">No upcoming reservations</span>;

    return (
        <span className="flex flex-wrap items-center gap-2">
            {current && <span className="badge badge-error">Reserved now until {timeFormatter.format(new Date(current.endUtc))}</span>}
            {!current && next && <span>Next: {timeFormatter.format(new Date(next.startUtc))}</span>}
            {waiting > 0 && <span className="badge badge-warning">{waiting} waiting</span>}
        </span>
    );
}
