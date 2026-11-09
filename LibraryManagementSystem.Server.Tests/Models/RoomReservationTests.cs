using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class RoomReservationTests
    {
        private static readonly DateTime Now = new(2026, 11, 9, 9, 0, 0, DateTimeKind.Utc);
        private static readonly DateTime Start = Now.AddDays(1);

        private static Section Room(SectionModel model = SectionModel.ReadingRoom) =>
            new() { Id = Guid.NewGuid(), Name = "Quiet room", Model = model };

        private static ApplicationUser Student() => new() { Id = "student-1", UserName = "reader", IsActive = true };

        private static RoomReservation Pending(Section room, DateTime? start = null, TimeSpan? length = null)
        {
            var from = start ?? Start;
            return RoomReservation.Request(room, Student(), [AppRoles.Student], from, from + (length ?? TimeSpan.FromHours(2)), "Society meeting", Now);
        }

        private static TableReservation PendingTable(DateTime? start = null, TimeSpan? length = null)
        {
            var table = new StudyTable { Id = Guid.NewGuid(), Name = "Table 1", Seats = 4, IsActive = true };
            var from = start ?? Start;
            return TableReservation.Request(table, Student(), [AppRoles.Student], from, from + (length ?? TimeSpan.FromHours(2)), null, Now);
        }

        private static RoomReservation Approved(Section room, DateTime? start = null)
        {
            var reservation = Pending(room, start);
            reservation.Approve("librarian", Now, [], []);
            return reservation;
        }

        // ---- Request ----

        [Fact]
        public void Request_files_a_pending_reservation_for_the_room()
        {
            var room = Room();

            var reservation = Pending(room);

            Assert.Equal(ReservationStatus.Pending, reservation.Status);
            Assert.Equal(room.Id, reservation.SectionId);
            Assert.Equal("Society meeting", reservation.Note);
        }

        [Theory]
        [InlineData(SectionModel.None)]
        [InlineData(SectionModel.Wing)]
        public void Request_rejects_a_section_that_is_not_a_reading_room(SectionModel model)
        {
            var exception = Assert.Throws<ReservationException>(() => Pending(Room(model)));

            Assert.Contains("not a reading room", exception.Message);
        }

        [Theory]
        [InlineData(AppRoles.Librarian)]
        [InlineData(AppRoles.Administrator)]
        public void Request_rejects_staff_roles(string role)
        {
            var exception = Assert.Throws<ReservationException>(() =>
                RoomReservation.Request(Room(), Student(), [role], Start, Start.AddHours(1), null, Now));

            Assert.Contains("reading rooms", exception.Message);
        }

        [Fact]
        public void Request_rejects_an_inactive_account()
        {
            var user = new ApplicationUser { Id = "s", UserName = "s", IsActive = false };

            Assert.Throws<ReservationException>(() =>
                RoomReservation.Request(Room(), user, [AppRoles.Student], Start, Start.AddHours(1), null, Now));
        }

        [Fact]
        public void Request_rejects_a_start_in_the_past()
        {
            Assert.Throws<ReservationException>(() => Pending(Room(), start: Now.AddMinutes(-1)));
        }

        [Fact]
        public void Request_rejects_more_than_four_hours()
        {
            Assert.Throws<ReservationException>(() => Pending(Room(), length: TimeSpan.FromHours(4) + TimeSpan.FromMinutes(1)));
        }

        // ---- Approve ----

        [Fact]
        public void Approve_holds_the_room()
        {
            var reservation = Pending(Room());

            reservation.Approve("librarian", Now, [], []);

            Assert.Equal(ReservationStatus.Approved, reservation.Status);
            Assert.Equal("librarian", reservation.DecidedByName);
        }

        [Fact]
        public void Approve_refuses_an_overlap_with_an_approved_reservation_of_the_same_room()
        {
            var room = Room();
            var held = Approved(room, Start.AddHours(1));
            var other = Pending(room, Start);

            var exception = Assert.Throws<ReservationException>(() => other.Approve("librarian", Now, [held], []));

            Assert.Contains("already reserved", exception.Message);
            Assert.Equal(ReservationStatus.Pending, other.Status);
        }

        [Fact]
        public void Approve_allows_back_to_back_reservations()
        {
            var room = Room();
            var held = Approved(room, Start);
            var next = Pending(room, Start.AddHours(2));

            next.Approve("librarian", Now, [held], []);

            Assert.Equal(ReservationStatus.Approved, next.Status);
        }

        [Fact]
        public void Approve_refuses_while_a_table_in_the_room_is_reserved_for_that_time()
        {
            var table = PendingTable(Start.AddHours(1));
            table.Approve("librarian", Now, []);
            var reservation = Pending(Room(), Start);

            var exception = Assert.Throws<ReservationException>(() => reservation.Approve("librarian", Now, [], [table]));

            Assert.Contains("table", exception.Message);
        }

        [Fact]
        public void Approve_ignores_a_table_reservation_that_was_not_approved()
        {
            var table = PendingTable(Start);
            var reservation = Pending(Room(), Start);

            reservation.Approve("librarian", Now, [], [table]);

            Assert.Equal(ReservationStatus.Approved, reservation.Status);
        }

        // ---- Table approvals against a reserved room ----

        [Fact]
        public void A_table_cannot_be_approved_while_its_reading_room_is_reserved_for_that_time()
        {
            var held = Approved(Room(), Start);
            var table = PendingTable(Start.AddHours(1));

            var exception = Assert.Throws<ReservationException>(() => table.Approve("librarian", Now, [], [held]));

            Assert.Contains("reading room", exception.Message);
        }

        [Fact]
        public void A_table_can_be_approved_outside_the_reserved_time()
        {
            var held = Approved(Room(), Start);
            var table = PendingTable(Start.AddHours(2));

            table.Approve("librarian", Now, [], [held]);

            Assert.Equal(ReservationStatus.Approved, table.Status);
        }

        // ---- Decide and cancel ----

        [Fact]
        public void Reject_records_the_reason_and_cancel_frees_an_approved_room()
        {
            var rejected = Pending(Room());
            rejected.Reject("librarian", Now, "  Closed for cleaning ");

            var approved = Approved(Room());
            approved.Cancel(Now);

            Assert.Equal("Closed for cleaning", rejected.DecisionNote);
            Assert.Equal(ReservationStatus.Cancelled, approved.Status);
        }

        // ---- Availability and idempotency ----

        [Theory]
        [InlineData(ReservationStatus.Pending, true)]
        [InlineData(ReservationStatus.Approved, true)]
        [InlineData(ReservationStatus.Rejected, false)]
        [InlineData(ReservationStatus.Cancelled, false)]
        public void Only_pending_and_approved_reservations_are_shown(ReservationStatus status, bool shown)
        {
            var reservation = Pending(Room());
            reservation.Status = status;

            Assert.Equal(shown, RoomReservation.OccupiesWindow(Start.AddHours(-1), Start.AddHours(5)).Compile()(reservation));
        }

        [Fact]
        public void A_repeat_of_the_same_request_is_recognised_but_a_different_room_or_time_is_not()
        {
            var room = Room();
            var reservation = Pending(room);

            Assert.True(reservation.IsSameRequestAs(room.Id, Start, Start.AddHours(2)));
            Assert.False(reservation.IsSameRequestAs(Guid.NewGuid(), Start, Start.AddHours(2)));
            Assert.False(reservation.IsSameRequestAs(room.Id, Start.AddHours(1), Start.AddHours(2)));
        }
    }
}
