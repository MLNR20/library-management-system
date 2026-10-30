using System.ComponentModel.DataAnnotations.Schema;

namespace LibraryManagementSystem.Server.Models
{
    // One clock-in / clock-out pair on a time card. ClockOut stays null while the user is still clocked in.
    public class ClockEntry
    {
        public Guid Id { get; set; }

        public Guid TimeCardId { get; set; }

        public TimeCard TimeCard { get; set; } = null!;

        public DateTime ClockInUtc { get; set; }

        public DateTime? ClockOutUtc { get; set; }

        // What the user is doing between clock-in and clock-out: working, on a break or at lunch.
        public ClockStatus Status { get; set; } = ClockStatus.Working;

        // Time between clock-in and clock-out; zero while still clocked in.
        [NotMapped]
        public TimeSpan Duration => ClockOutUtc is { } clockOut && clockOut > ClockInUtc
            ? clockOut - ClockInUtc
            : TimeSpan.Zero;

        // Total hours as a decimal, e.g. 7h 30m is 7.5.
        [NotMapped]
        public double TotalHours => Math.Round(Duration.TotalHours, 2);
    }
}
