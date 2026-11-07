using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class TableReservationTests
    {
        private static readonly DateTime Now = new(2026, 11, 7, 9, 0, 0, DateTimeKind.Utc);
        private static readonly DateTime Start = Now.AddDays(1);

        private static StudyTable Table(bool active = true) =>
            new() { Id = Guid.NewGuid(), Name = "Table 1", Seats = 4, IsActive = active };

        private static ApplicationUser Student() => new() { Id = "student-1", UserName = "reader", IsActive = true };

        private static TableReservation Pending(StudyTable table, DateTime? start = null, TimeSpan? length = null)
        {
            var from = start ?? Start;
            return TableReservation.Request(table, Student(), [AppRoles.Student], from, from + (length ?? TimeSpan.FromHours(2)), "Group study", Now);
        }

        // ---- Request ----

        [Fact]
        public void Request_files_a_pending_reservation_that_does_not_hold_the_table_yet()
        {
            var table = Table();

            var reservation = Pending(table);

            Assert.Equal(ReservationStatus.Pending, reservation.Status);
            Assert.Equal(table.Id, reservation.TableId);
            Assert.Equal("student-1", reservation.UserId);
            Assert.Equal(Now, reservation.RequestedAtUtc);
            Assert.Null(reservation.DecidedAtUtc);
        }

        [Fact]
        public void Request_trims_the_note_and_drops_a_blank_one()
        {
            var table = Table();

            var withNote = TableReservation.Request(table, Student(), [AppRoles.Student], Start, Start.AddHours(1), "  Exam prep ", Now);
            var blank = TableReservation.Request(table, Student(), [AppRoles.Student], Start, Start.AddHours(1), "   ", Now);

            Assert.Equal("Exam prep", withNote.Note);
            Assert.Null(blank.Note);
        }

        [Theory]
        [InlineData(AppRoles.Librarian)]
        [InlineData(AppRoles.Administrator)]
        public void Request_rejects_staff_roles(string role)
        {
            var exception = Assert.Throws<ReservationException>(() =>
                TableReservation.Request(Table(), Student(), [role], Start, Start.AddHours(1), null, Now));

            Assert.Contains("Student", exception.Message);
        }

        [Theory]
        [InlineData(AppRoles.Student)]
        [InlineData("visitor")]
        public void Request_allows_students_and_visitors(string role)
        {
            var exception = Record.Exception(() =>
                TableReservation.Request(Table(), Student(), [role], Start, Start.AddHours(1), null, Now));

            Assert.Null(exception);
        }

        [Fact]
        public void Request_rejects_an_inactive_user()
        {
            var user = Student();
            user.IsActive = false;

            Assert.Throws<ReservationException>(() =>
                TableReservation.Request(Table(), user, [AppRoles.Student], Start, Start.AddHours(1), null, Now));
        }

        [Fact]
        public void Request_rejects_a_table_that_is_out_of_service()
        {
            var exception = Assert.Throws<ReservationException>(() => Pending(Table(active: false)));

            Assert.Contains("out of service", exception.Message);
        }

        [Fact]
        public void Request_rejects_a_slot_that_ends_before_it_starts_or_has_no_length()
        {
            Assert.Throws<ReservationException>(() =>
                TableReservation.Request(Table(), Student(), [AppRoles.Student], Start, Start, null, Now));
            Assert.Throws<ReservationException>(() =>
                TableReservation.Request(Table(), Student(), [AppRoles.Student], Start, Start.AddHours(-1), null, Now));
        }

        [Fact]
        public void Request_rejects_a_slot_that_starts_in_the_past()
        {
            Assert.Throws<ReservationException>(() => Pending(Table(), start: Now.AddMinutes(-5)));
            Assert.Throws<ReservationException>(() => Pending(Table(), start: Now));
        }

        [Fact]
        public void Request_allows_exactly_the_maximum_duration_but_not_more()
        {
            Assert.Null(Record.Exception(() => Pending(Table(), length: TableReservation.MaxDuration)));
            Assert.Throws<ReservationException>(() => Pending(Table(), length: TableReservation.MaxDuration + TimeSpan.FromMinutes(1)));
        }

        // ---- ClashesWith ----

        [Fact]
        public void Reservations_clash_when_they_overlap_on_the_same_table()
        {
            var table = Table();

            Assert.True(Pending(table, Start).ClashesWith(Pending(table, Start.AddHours(1))));
            Assert.True(Pending(table, Start).ClashesWith(Pending(table, Start)));
        }

        [Fact]
        public void Reservations_that_only_touch_do_not_clash()
        {
            var table = Table();
            var first = Pending(table, Start, TimeSpan.FromHours(2));
            var second = Pending(table, Start.AddHours(2), TimeSpan.FromHours(1));

            Assert.False(first.ClashesWith(second));
            Assert.False(second.ClashesWith(first));
        }

        [Fact]
        public void Reservations_for_different_tables_never_clash()
        {
            Assert.False(Pending(Table(), Start).ClashesWith(Pending(Table(), Start)));
        }

        // ---- Approve ----

        [Fact]
        public void Approve_marks_it_approved_and_records_who_and_when()
        {
            var reservation = Pending(Table());

            reservation.Approve("librarian", Now, []);

            Assert.Equal(ReservationStatus.Approved, reservation.Status);
            Assert.Equal("librarian", reservation.DecidedByName);
            Assert.Equal(Now, reservation.DecidedAtUtc);
        }

        [Fact]
        public void Approve_refuses_when_another_approved_reservation_clashes()
        {
            var table = Table();
            var existing = Pending(table, Start);
            existing.Approve("librarian", Now, []);
            var clashing = Pending(table, Start.AddHours(1));

            var exception = Assert.Throws<ReservationException>(() => clashing.Approve("librarian", Now, [existing]));

            Assert.Contains("already reserved", exception.Message);
            Assert.Equal(ReservationStatus.Pending, clashing.Status);
        }

        [Fact]
        public void Approve_ignores_clashing_reservations_that_are_not_approved()
        {
            var table = Table();
            var otherPending = Pending(table, Start);
            var reservation = Pending(table, Start);

            reservation.Approve("librarian", Now, [otherPending]);

            Assert.Equal(ReservationStatus.Approved, reservation.Status);
        }

        [Fact]
        public void Approve_allows_back_to_back_reservations()
        {
            var table = Table();
            var first = Pending(table, Start, TimeSpan.FromHours(2));
            first.Approve("librarian", Now, []);
            var next = Pending(table, Start.AddHours(2));

            next.Approve("librarian", Now, [first]);

            Assert.Equal(ReservationStatus.Approved, next.Status);
        }

        [Fact]
        public void Approve_refuses_a_reservation_that_has_already_passed()
        {
            var reservation = Pending(Table());

            Assert.Throws<ReservationException>(() => reservation.Approve("librarian", Start.AddHours(3), []));
        }

        [Theory]
        [InlineData(ReservationStatus.Approved)]
        [InlineData(ReservationStatus.Rejected)]
        [InlineData(ReservationStatus.Cancelled)]
        public void Approve_only_works_on_a_pending_reservation(ReservationStatus status)
        {
            var reservation = Pending(Table());
            reservation.Status = status;

            Assert.Throws<ReservationException>(() => reservation.Approve("librarian", Now, []));
        }

        // ---- Reject ----

        [Fact]
        public void Reject_records_the_reason_and_who_decided()
        {
            var reservation = Pending(Table());

            reservation.Reject("librarian", Now, " Room closed for repairs ");

            Assert.Equal(ReservationStatus.Rejected, reservation.Status);
            Assert.Equal("Room closed for repairs", reservation.DecisionNote);
            Assert.Equal("librarian", reservation.DecidedByName);
        }

        [Fact]
        public void Reject_only_works_on_a_pending_reservation()
        {
            var reservation = Pending(Table());
            reservation.Approve("librarian", Now, []);

            Assert.Throws<ReservationException>(() => reservation.Reject("librarian", Now, null));
        }

        // ---- Cancel ----

        [Theory]
        [InlineData(ReservationStatus.Pending)]
        [InlineData(ReservationStatus.Approved)]
        public void Cancel_withdraws_a_pending_or_approved_reservation(ReservationStatus status)
        {
            var reservation = Pending(Table());
            reservation.Status = status;

            reservation.Cancel(Now);

            Assert.Equal(ReservationStatus.Cancelled, reservation.Status);
        }

        [Theory]
        [InlineData(ReservationStatus.Rejected)]
        [InlineData(ReservationStatus.Cancelled)]
        public void Cancel_refuses_a_reservation_that_is_already_closed(ReservationStatus status)
        {
            var reservation = Pending(Table());
            reservation.Status = status;

            Assert.Throws<ReservationException>(() => reservation.Cancel(Now));
        }

        [Fact]
        public void Cancel_refuses_a_reservation_that_has_finished()
        {
            var reservation = Pending(Table());

            Assert.Throws<ReservationException>(() => reservation.Cancel(Start.AddHours(3)));
        }
    }
}
