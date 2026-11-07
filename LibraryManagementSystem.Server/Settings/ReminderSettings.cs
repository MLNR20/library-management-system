using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Settings
{
    // Bound from the "Reminders" configuration section: when the due-books job runs and who it reminds.
    public class ReminderSettings
    {
        public const string SectionName = "Reminders";

        // Local time of day the job runs, "HH:mm". It also runs once at startup, which is safe: a loan gets one reminder per day.
        public TimeOnly RunAt { get; set; } = new(8, 0);

        // Windows or IANA id of the zone RunAt is read in. Empty means the server's own time zone.
        public string? TimeZoneId { get; set; }

        // Open loans falling due within this many days get a "due soon" reminder (overdue loans always get one).
        [Range(1, 30)]
        public int DueSoonDays { get; set; } = 2;

        public TimeZoneInfo ResolveTimeZone() =>
            string.IsNullOrWhiteSpace(TimeZoneId) ? TimeZoneInfo.Local : TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
    }
}
