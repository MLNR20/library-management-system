using System.Linq.Expressions;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    // One student's request for a whole reading room for one stretch of time. Once a librarian approves it the room is held:
    // no other room reservation and none of the room's tables can be approved for that time.
    public class RoomReservation : ReservationBase
    {
        // The reading room (a Section whose model is ReadingRoom).
        public Guid SectionId { get; set; }

        public Section Section { get; set; } = null!;

        // A retry of the same request asks for the same room and time; reusing a key for something else is a client bug.
        public bool IsSameRequestAs(Guid sectionId, DateTime startUtc, DateTime endUtc) =>
            SectionId == sectionId && StartUtc == startUtc && EndUtc == endUtc;

        // What the availability view shows: pending and approved reservations that overlap [fromUtc, toUtc).
        public static Expression<Func<RoomReservation, bool>> OccupiesWindow(DateTime fromUtc, DateTime toUtc) =>
            r => (r.Status == ReservationStatus.Pending || r.Status == ReservationStatus.Approved)
                && r.StartUtc < toUtc && r.EndUtc > fromUtc;

        // Only active students and visitors may reserve, only reading rooms, and only for a future slot of up to four hours.
        public static RoomReservation Request(
            Section section, ApplicationUser user, IEnumerable<string> roles, DateTime startUtc, DateTime endUtc, string? note, DateTime nowUtc)
        {
            EnsureCanReserve(user, roles, "reading rooms");

            if (section.Model != SectionModel.ReadingRoom)
            {
                throw new ReservationException($"Section '{section.Name}' is not a reading room and cannot be reserved.");
            }

            EnsureValidTimes(startUtc, endUtc, nowUtc);

            return new RoomReservation
            {
                Id = Guid.NewGuid(),
                Section = section,
                SectionId = section.Id,
                User = user,
                UserId = user.Id,
                StartUtc = startUtc,
                EndUtc = endUtc,
                Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
                Status = ReservationStatus.Pending,
                RequestedAtUtc = nowUtc
            };
        }

        // A librarian approves it. approvedOnSameRoom are the room's already approved reservations and approvedTablesInRoom the
        // approved table reservations of tables in the room: the new one may not overlap any, because an approval is a promise
        // that the whole room is free.
        public void Approve(
            string deciderName,
            DateTime nowUtc,
            IEnumerable<RoomReservation> approvedOnSameRoom,
            IEnumerable<TableReservation> approvedTablesInRoom)
        {
            var clash =
                approvedOnSameRoom.Any(other => other.Id != Id && other.Status == ReservationStatus.Approved && OverlapsInTime(other))
                    ? $"'{Section.Name}' is already reserved for part of that time."
                : approvedTablesInRoom.Any(table => table.Status == ReservationStatus.Approved && OverlapsInTime(table))
                    ? $"A table in '{Section.Name}' is already reserved for part of that time."
                    : null;

            ApproveUnlessClashing(deciderName, nowUtc, clash);
        }
    }
}
