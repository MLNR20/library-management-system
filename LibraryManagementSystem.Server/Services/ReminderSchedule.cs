namespace LibraryManagementSystem.Server.Services
{
    // The "cron" arithmetic of the reminder job, kept pure so it can be tested without a clock.
    public static class ReminderSchedule
    {
        // The next UTC moment strictly after nowUtc at which the local clock in `zone` reads runAt.
        public static DateTime NextRunUtc(DateTime nowUtc, TimeOnly runAt, TimeZoneInfo zone)
        {
            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc), zone);
            var candidate = DateTime.SpecifyKind(local.Date + runAt.ToTimeSpan(), DateTimeKind.Unspecified);

            if (candidate <= local)
            {
                candidate = candidate.AddDays(1);
            }

            // A daylight-saving jump can skip runAt altogether; run an hour later instead.
            if (zone.IsInvalidTime(candidate))
            {
                candidate = candidate.AddHours(1);
            }

            return TimeZoneInfo.ConvertTimeToUtc(candidate, zone);
        }
    }
}
