using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class ReservationIdempotencyTests
    {
        private static readonly DateTime Start = new(2026, 11, 9, 14, 0, 0, DateTimeKind.Utc);

        private static TableReservation Filed(Guid tableId) => new()
        {
            TableId = tableId,
            StartUtc = Start,
            EndUtc = Start.AddHours(2),
            IdempotencyKey = "key-1"
        };

        [Fact]
        public void A_repeat_of_the_same_request_is_recognised()
        {
            var tableId = Guid.NewGuid();

            Assert.True(Filed(tableId).IsSameRequestAs(tableId, Start, Start.AddHours(2)));
        }

        [Fact]
        public void A_different_table_is_not_the_same_request()
        {
            Assert.False(Filed(Guid.NewGuid()).IsSameRequestAs(Guid.NewGuid(), Start, Start.AddHours(2)));
        }

        [Theory]
        [InlineData(1, 2)] // starts later
        [InlineData(0, 3)] // ends later
        [InlineData(0, 1)] // ends earlier
        public void A_different_time_is_not_the_same_request(int startOffsetHours, int endOffsetHours)
        {
            var tableId = Guid.NewGuid();

            Assert.False(Filed(tableId).IsSameRequestAs(tableId, Start.AddHours(startOffsetHours), Start.AddHours(endOffsetHours)));
        }

        [Fact]
        public void The_key_length_limit_matches_the_column()
        {
            Assert.Equal(64, TableReservation.IdempotencyKeyMaxLength);
        }
    }
}
