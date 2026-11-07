using LibraryManagementSystem.Server.Services;

namespace LibraryManagementSystem.Server.Tests.Services
{
    public class ReminderScheduleTests
    {
        private static readonly TimeOnly EightAm = new(8, 0);

        private static DateTime Utc(int month, int day, int hour, int minute = 0) =>
            new(2026, month, day, hour, minute, 0, DateTimeKind.Utc);

        [Fact]
        public void Before_the_run_time_the_next_run_is_today()
        {
            var next = ReminderSchedule.NextRunUtc(Utc(11, 7, 6), EightAm, TimeZoneInfo.Utc);

            Assert.Equal(Utc(11, 7, 8), next);
        }

        [Theory]
        [InlineData(8, 0)]
        [InlineData(9, 30)]
        public void At_or_after_the_run_time_the_next_run_is_tomorrow(int hour, int minute)
        {
            var next = ReminderSchedule.NextRunUtc(Utc(11, 7, hour, minute), EightAm, TimeZoneInfo.Utc);

            Assert.Equal(Utc(11, 8, 8), next);
        }

        [Fact]
        public void The_run_time_is_read_in_the_given_time_zone()
        {
            // UTC+8 all year: 08:00 local is 00:00 UTC.
            var zone = TimeZoneInfo.CreateCustomTimeZone("test+8", TimeSpan.FromHours(8), "test", "test");

            // 20:00 UTC on the 7th is 04:00 on the 8th locally, so 08:00 local on the 8th = 00:00 UTC on the 8th.
            var next = ReminderSchedule.NextRunUtc(Utc(11, 7, 20), EightAm, zone);

            Assert.Equal(Utc(11, 8, 0), next);
        }

        [Fact]
        public void The_next_run_is_always_in_the_future()
        {
            var now = Utc(11, 7, 8);

            Assert.True(ReminderSchedule.NextRunUtc(now, EightAm, TimeZoneInfo.Utc) > now);
        }
    }
}
