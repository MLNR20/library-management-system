using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class NotificationTests
    {
        private static readonly DateTime Now = new(2026, 11, 7, 8, 0, 0, DateTimeKind.Utc);
        private const int DueSoonDays = 2;

        // An open loan due `dueIn` from Now (negative = already late).
        private static Borrowing LoanDue(TimeSpan dueIn)
        {
            var book = new Book { Id = Guid.NewGuid(), Title = "Dune" };
            var user = new ApplicationUser { Id = "user-1", UserName = "reader", IsActive = true };
            var loan = Borrowing.Start(book, user, [AppRoles.Student], Now - TimeSpan.FromDays(14), TimeSpan.FromDays(14));
            loan.Id = Guid.NewGuid();
            loan.DueAtUtc = Now + dueIn;

            return loan;
        }

        [Fact]
        public void ForLoan_is_null_when_the_loan_is_not_due_within_the_window()
        {
            Assert.Null(Notification.ForLoan(LoanDue(TimeSpan.FromDays(5)), Now, DueSoonDays));
        }

        [Fact]
        public void ForLoan_is_null_for_a_returned_loan_even_if_it_was_late()
        {
            var loan = LoanDue(TimeSpan.FromDays(-3));
            loan.Return(Now, 1m);

            Assert.Null(Notification.ForLoan(loan, Now, DueSoonDays));
        }

        [Theory]
        [InlineData(2)]
        [InlineData(1)]
        public void ForLoan_gives_a_due_soon_reminder_inside_the_window(int days)
        {
            var loan = LoanDue(TimeSpan.FromDays(days));

            var reminder = Notification.ForLoan(loan, Now, DueSoonDays);

            Assert.NotNull(reminder);
            Assert.Equal(NotificationKind.DueSoon, reminder.Kind);
            Assert.Equal(loan.UserId, reminder.UserId);
            Assert.Equal(loan.Id, reminder.BorrowingId);
            Assert.Equal(new DateOnly(2026, 11, 7), reminder.Day);
            Assert.Contains("Dune", reminder.Message);
            Assert.Null(reminder.ReadAtUtc);
        }

        [Fact]
        public void ForLoan_gives_an_overdue_reminder_with_the_days_late()
        {
            var reminder = Notification.ForLoan(LoanDue(TimeSpan.FromDays(-3)), Now, DueSoonDays);

            Assert.NotNull(reminder);
            Assert.Equal(NotificationKind.Overdue, reminder.Kind);
            Assert.Contains("3 days overdue", reminder.Message);
        }

        [Fact]
        public void ForLoan_treats_a_loan_due_exactly_now_as_due_soon_not_overdue()
        {
            var reminder = Notification.ForLoan(LoanDue(TimeSpan.Zero), Now, DueSoonDays);

            Assert.NotNull(reminder);
            Assert.Equal(NotificationKind.DueSoon, reminder.Kind);
        }

        [Fact]
        public void MarkRead_keeps_the_first_read_time()
        {
            var reminder = Notification.ForLoan(LoanDue(TimeSpan.FromDays(1)), Now, DueSoonDays)!;

            reminder.MarkRead(Now);
            reminder.MarkRead(Now.AddHours(5));

            Assert.Equal(Now, reminder.ReadAtUtc);
        }
    }
}
