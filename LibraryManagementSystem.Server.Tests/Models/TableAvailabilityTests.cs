using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class TableAvailabilityTests
    {
        private static readonly DateTime Day = new(2026, 11, 8, 8, 0, 0, DateTimeKind.Utc);

        private static TableReservation Reservation(ReservationStatus status, int fromHour, int toHour) => new()
        {
            TableId = Guid.NewGuid(),
            StartUtc = Day.AddHours(fromHour),
            EndUtc = Day.AddHours(toHour),
            Status = status
        };

        private static bool Shown(TableReservation reservation, int fromHour, int toHour) =>
            TableReservation.OccupiesWindow(Day.AddHours(fromHour), Day.AddHours(toHour)).Compile()(reservation);

        [Theory]
        [InlineData(ReservationStatus.Pending)]
        [InlineData(ReservationStatus.Approved)]
        public void Pending_and_approved_reservations_are_shown(ReservationStatus status)
        {
            Assert.True(Shown(Reservation(status, 2, 4), 0, 12));
        }

        [Theory]
        [InlineData(ReservationStatus.Rejected)]
        [InlineData(ReservationStatus.Cancelled)]
        public void Rejected_and_cancelled_reservations_free_the_table_again(ReservationStatus status)
        {
            Assert.False(Shown(Reservation(status, 2, 4), 0, 12));
        }

        [Theory]
        [InlineData(0, 3, true)] // overlaps the start
        [InlineData(3, 12, true)] // overlaps the end
        [InlineData(0, 12, true)] // contains it
        [InlineData(3, 4, true)] // inside it
        [InlineData(0, 2, false)] // ends exactly when it starts
        [InlineData(4, 12, false)] // starts exactly when it ends
        [InlineData(5, 12, false)] // after it
        public void Only_reservations_overlapping_the_window_are_shown(int fromHour, int toHour, bool expected)
        {
            Assert.Equal(expected, Shown(Reservation(ReservationStatus.Approved, 2, 4), fromHour, toHour));
        }
    }
}
