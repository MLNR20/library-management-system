using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class BorrowingRulesTests
    {
        private static readonly DateTime Due = new(2026, 11, 21, 12, 0, 0, DateTimeKind.Utc);

        // Every shape a loan can have relative to its due date: open or returned, early, exactly on time, or late.
        public static TheoryData<DateTime?, DateTime> Cases()
        {
            var data = new TheoryData<DateTime?, DateTime>();
            DateTime?[] returnedAt =
            [
                null,
                Due.AddDays(-3),
                Due.AddSeconds(-1),
                Due,
                Due.AddSeconds(1),
                Due.AddDays(1),
                Due.AddDays(5).AddHours(3)
            ];
            DateTime[] asOf = [Due.AddDays(-5), Due.AddSeconds(-1), Due, Due.AddSeconds(1), Due.AddDays(2), Due.AddDays(30)];

            foreach (var r in returnedAt)
            {
                foreach (var a in asOf)
                {
                    data.Add(r, a);
                }
            }

            return data;
        }

        private static Borrowing Loan(DateTime? returnedAt) => new() { DueAtUtc = Due, ReturnedAtUtc = returnedAt };

        [Theory]
        [MemberData(nameof(Cases))]
        public void Overdue_query_expression_agrees_with_the_entity(DateTime? returnedAt, DateTime asOf)
        {
            var loan = Loan(returnedAt);

            var byQuery = BorrowingRules.Overdue(asOf).Compile()(loan);

            Assert.Equal(loan.IsOverdue(asOf), byQuery);
            Assert.Equal(loan.OverdueDays(asOf) > 0, byQuery);
        }

        [Theory]
        [MemberData(nameof(Cases))]
        public void OpenOverdue_is_overdue_and_still_out(DateTime? returnedAt, DateTime asOf)
        {
            var loan = Loan(returnedAt);

            var openOverdue = BorrowingRules.OpenOverdue(asOf).Compile()(loan);

            Assert.Equal(!loan.IsReturned && loan.IsOverdue(asOf), openOverdue);
        }

        [Fact]
        public void Overdue_query_translates_to_sql_with_asOf_as_a_parameter()
        {
            using var context = NewContext();
            var asOf = new DateTime(2026, 11, 22, 0, 0, 0, DateTimeKind.Utc);

            var sql = context.Borrowings.Where(BorrowingRules.Overdue(asOf)).ToQueryString();

            Assert.Contains("[b].[DueAtUtc]", sql);
            Assert.Contains("COALESCE", sql, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void OpenOverdue_query_translates_to_sql()
        {
            using var context = NewContext();
            var asOf = new DateTime(2026, 11, 22, 0, 0, 0, DateTimeKind.Utc);

            var sql = context.Borrowings.Where(BorrowingRules.OpenOverdue(asOf)).ToQueryString();

            Assert.Contains("[b].[ReturnedAtUtc] IS NULL", sql);
            Assert.Contains("[b].[DueAtUtc] <", sql);
        }

        // Builds the SQL only; nothing connects to the server.
        private static ApplicationDbContext NewContext() =>
            new(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlServer("Server=(local);Database=Unused;Trusted_Connection=True;TrustServerCertificate=True")
                .Options);
    }
}
