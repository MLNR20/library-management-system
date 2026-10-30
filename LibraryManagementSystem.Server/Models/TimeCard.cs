using System.ComponentModel.DataAnnotations;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    // One time card per user per day; the day's clock-ins and clock-outs live in Entries.
    public class TimeCard
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        // The day the card covers (the "date today" it was opened on).
        public DateOnly Date { get; set; }

        // Hours and minutes rendered for the day, kept split so they display as "7h 30m".
        [Range(0, int.MaxValue)]
        public int TotalHours { get; set; }

        [Range(0, 59)]
        public int TotalMinutes { get; set; }

        public ICollection<ClockEntry> Entries { get; set; } = [];

        // Re-adds every finished working entry (breaks and lunches are not counted); call after clocking out or editing an entry.
        public void RecalculateTotals()
        {
            var total = TimeSpan.FromTicks(Entries
                .Where(e => e.Status == ClockStatus.Working)
                .Sum(e => e.Duration.Ticks));

            TotalHours = (int)total.TotalHours;
            TotalMinutes = total.Minutes;
        }
    }
}
