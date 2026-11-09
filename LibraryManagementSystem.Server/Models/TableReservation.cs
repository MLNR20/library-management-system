using System.Linq.Expressions;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    // One student's request for one table for one stretch of time. It only holds the table once a librarian approves it.
    public class TableReservation : ReservationBase
    {
        public Guid TableId { get; set; }

        public StudyTable Table { get; set; } = null!;

        // A retry of the same request asks for the same table and time; reusing a key for something else is a client bug.
        public bool IsSameRequestAs(Guid tableId, DateTime startUtc, DateTime endUtc) =>
            TableId == tableId && StartUtc == startUtc && EndUtc == endUtc;

        // Two reservations clash when they are for the same table and their times overlap; touching ends do not clash.
        public bool ClashesWith(TableReservation other) => TableId == other.TableId && OverlapsInTime(other);

        // What the availability view shows: pending and approved reservations that overlap [fromUtc, toUtc).
        // An expression so it runs in the database; touching ends do not overlap.
        public static Expression<Func<TableReservation, bool>> OccupiesWindow(DateTime fromUtc, DateTime toUtc) =>
            r => (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)
                && r.StartUtc < toUtc && r.EndUtc > fromUtc;

        // Only active students and visitors may reserve, only active tables, and only for a future slot of up to four hours.
        public static TableReservation Request(
            StudyTable table, ApplicationUser user, IEnumerable<string> roles, DateTime startUtc, DateTime endUtc, string? note, DateTime nowUtc)
        {
            EnsureCanReserve(user, roles, "tables");

            if (!table.IsActive)
            {
                throw new ReservationException($"'{table.Name}' is out of service and cannot be reserved.");
            }

            EnsureValidTimes(startUtc, endUtc, nowUtc);

            return new TableReservation
            {
                Id = Guid.NewGuid(),
                Table = table,
                TableId = table.Id,
                User = user,
                UserId = user.Id,
                StartUtc = startUtc,
                EndUtc = endUtc,
                Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
                Status = ReservationStatus.Pending,
                RequestedAtUtc = nowUtc
            };
        }

        // A librarian approves it. approvedOnSameTable are the table's already approved reservations: the new one may not
        // clash with any, because an approval is a promise that the table is free. approvedRoomHolds are the approved
        // reservations of the whole reading room the table is in: while one is on, the table is part of it.
        public void Approve(
            string deciderName,
            DateTime nowUtc,
            IEnumerable<TableReservation> approvedOnSameTable,
            IEnumerable<RoomReservation>? approvedRoomHolds = null)
        {
            var clash =
                approvedOnSameTable.Any(other => other.Id != Id && other.Status == ReservationStatus.Approved && ClashesWith(other))
                    ? $"'{Table.Name}' is already reserved for part of that time."
                : approvedRoomHolds?.Any(room => room.Status == ReservationStatus.Approved && OverlapsInTime(room)) == true
                    ? $"'{Table.Name}' is in a reading room that is reserved for part of that time."
                    : null;

            ApproveUnlessClashing(deciderName, nowUtc, clash);
        }
    }
}
