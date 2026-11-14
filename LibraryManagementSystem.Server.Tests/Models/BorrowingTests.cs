using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class BorrowingTests
    {
        private static readonly DateTime Now = new(2026, 11, 7, 12, 0, 0, DateTimeKind.Utc);
        private static readonly TimeSpan LoanPeriod = TimeSpan.FromDays(14);
        private const decimal PenaltyPerDay = 0.50m;

        private static ApplicationUser ActiveUser() => new() { Id = "user-1", UserName = "reader", IsActive = true };

        private static Book AvailableBook() => new() { Id = Guid.NewGuid(), Title = "Dune" };

        private static Borrowing OpenLoan(DateTime borrowedAt, TimeSpan? period = null)
        {
            var book = AvailableBook();
            return Borrowing.Start(book, ActiveUser(), [AppRoles.Student], borrowedAt, period ?? LoanPeriod);
        }

        // ---- EnsureCanBorrow ----

        [Theory]
        [InlineData(AppRoles.Student)]
        [InlineData(AppRoles.Visitor)]
        [InlineData("student")]
        [InlineData("VISITOR")]
        public void EnsureCanBorrow_allows_active_borrower_roles_case_insensitively(string role)
        {
            var exception = Record.Exception(() => Borrowing.EnsureCanBorrow(ActiveUser(), [role], Now));

            Assert.Null(exception);
        }

        [Fact]
        public void EnsureCanBorrow_rejects_inactive_user()
        {
            var user = ActiveUser();
            user.IsActive = false;

            var exception = Assert.Throws<BorrowingException>(() => Borrowing.EnsureCanBorrow(user, [AppRoles.Student], Now));

            Assert.Contains("not active", exception.Message);
        }

        [Fact]
        public void EnsureCanBorrow_rejects_user_who_is_currently_locked_out()
        {
            var user = ActiveUser();
            user.LockoutEnabled = true;
            user.LockoutEnd = Now.AddMinutes(10);

            var exception = Assert.Throws<BorrowingException>(() => Borrowing.EnsureCanBorrow(user, [AppRoles.Student], Now));

            Assert.Contains("locked", exception.Message);
        }

        [Fact]
        public void EnsureCanBorrow_allows_user_whose_lockout_has_expired()
        {
            var user = ActiveUser();
            user.LockoutEnabled = true;
            user.LockoutEnd = Now.AddMinutes(-1);

            var exception = Record.Exception(() => Borrowing.EnsureCanBorrow(user, [AppRoles.Student], Now));

            Assert.Null(exception);
        }

        [Fact]
        public void EnsureCanBorrow_ignores_lockout_end_when_lockout_is_disabled()
        {
            var user = ActiveUser();
            user.LockoutEnabled = false;
            user.LockoutEnd = Now.AddDays(1);

            var exception = Record.Exception(() => Borrowing.EnsureCanBorrow(user, [AppRoles.Student], Now));

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(AppRoles.Administrator)]
        [InlineData(AppRoles.Librarian)]
        public void EnsureCanBorrow_rejects_staff_roles(string role)
        {
            var exception = Assert.Throws<BorrowingException>(() => Borrowing.EnsureCanBorrow(ActiveUser(), [role], Now));

            Assert.Contains(AppRoles.Student, exception.Message);
            Assert.Contains(AppRoles.Visitor, exception.Message);
        }

        [Fact]
        public void EnsureCanBorrow_rejects_user_without_any_role()
        {
            Assert.Throws<BorrowingException>(() => Borrowing.EnsureCanBorrow(ActiveUser(), [], Now));
        }

        // ---- Start ----

        [Fact]
        public void Start_marks_book_borrowed_and_sets_due_date()
        {
            var book = AvailableBook();
            var user = ActiveUser();

            var borrowing = Borrowing.Start(book, user, [AppRoles.Student], Now, LoanPeriod);

            Assert.Equal(BookStatus.Borrowed, book.Status);
            Assert.Same(book, borrowing.Book);
            Assert.Equal(book.Id, borrowing.BookId);
            Assert.Same(user, borrowing.User);
            Assert.Equal(user.Id, borrowing.UserId);
            Assert.Equal(Now, borrowing.BorrowedAtUtc);
            Assert.Equal(Now + LoanPeriod, borrowing.DueAtUtc);
            Assert.Null(borrowing.ReturnedAtUtc);
            Assert.False(borrowing.IsReturned);
            Assert.Equal(0m, borrowing.PenaltyAmount);
        }

        [Theory]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.Reserved)]
        [InlineData(BookStatus.Lost)]
        [InlineData(BookStatus.Damaged)]
        public void Start_rejects_book_that_is_not_available(BookStatus status)
        {
            var book = AvailableBook();
            book.TransitionTo(status);

            var exception = Assert.Throws<BorrowingException>(
                () => Borrowing.Start(book, ActiveUser(), [AppRoles.Student], Now, LoanPeriod));

            Assert.Contains(book.Title, exception.Message);
            Assert.Contains(status.ToString().ToLowerInvariant(), exception.Message);
            Assert.Equal(status, book.Status);
        }

        [Fact]
        public void Start_does_not_touch_the_book_when_the_borrower_is_ineligible()
        {
            var book = AvailableBook();
            var user = ActiveUser();
            user.IsActive = false;

            Assert.Throws<BorrowingException>(() => Borrowing.Start(book, user, [AppRoles.Student], Now, LoanPeriod));

            Assert.Equal(BookStatus.Available, book.Status);
        }

        [Fact]
        public void A_book_cannot_be_borrowed_twice_without_being_returned()
        {
            var book = AvailableBook();
            Borrowing.Start(book, ActiveUser(), [AppRoles.Student], Now, LoanPeriod);

            Assert.Throws<BorrowingException>(
                () => Borrowing.Start(book, ActiveUser(), [AppRoles.Visitor], Now, LoanPeriod));
        }

        // ---- OverdueDays / IsOverdue ----

        [Fact]
        public void OverdueDays_is_zero_before_the_due_date()
        {
            var borrowing = OpenLoan(Now);

            Assert.Equal(0, borrowing.OverdueDays(borrowing.DueAtUtc.AddDays(-1)));
            Assert.False(borrowing.IsOverdue(borrowing.DueAtUtc.AddDays(-1)));
        }

        [Fact]
        public void OverdueDays_is_zero_exactly_at_the_due_date()
        {
            var borrowing = OpenLoan(Now);

            Assert.Equal(0, borrowing.OverdueDays(borrowing.DueAtUtc));
            Assert.False(borrowing.IsOverdue(borrowing.DueAtUtc));
        }

        [Fact]
        public void OverdueDays_counts_a_started_day_as_a_full_day()
        {
            var borrowing = OpenLoan(Now);

            Assert.Equal(1, borrowing.OverdueDays(borrowing.DueAtUtc.AddSeconds(1)));
            Assert.Equal(1, borrowing.OverdueDays(borrowing.DueAtUtc.AddDays(1)));
            Assert.Equal(2, borrowing.OverdueDays(borrowing.DueAtUtc.AddDays(1).AddSeconds(1)));
            Assert.True(borrowing.IsOverdue(borrowing.DueAtUtc.AddSeconds(1)));
        }

        [Fact]
        public void OverdueDays_of_a_returned_loan_is_measured_to_the_return_time_not_to_now()
        {
            var borrowing = OpenLoan(Now);
            borrowing.Return(borrowing.DueAtUtc.AddDays(2), PenaltyPerDay);

            var farFuture = borrowing.DueAtUtc.AddDays(100);

            Assert.Equal(2, borrowing.OverdueDays(farFuture));
        }

        // ---- CalculatePenalty ----

        [Theory]
        [InlineData(0, 0.0)]
        [InlineData(1, 0.5)]
        [InlineData(3, 1.5)]
        [InlineData(10, 5.0)]
        public void CalculatePenalty_is_overdue_days_times_the_daily_rate(int daysLate, double expected)
        {
            var borrowing = OpenLoan(Now);

            var penalty = borrowing.CalculatePenalty(borrowing.DueAtUtc.AddDays(daysLate), PenaltyPerDay);

            Assert.Equal((decimal)expected, penalty);
        }

        [Fact]
        public void CalculatePenalty_is_zero_when_the_rate_is_zero()
        {
            var borrowing = OpenLoan(Now);

            Assert.Equal(0m, borrowing.CalculatePenalty(borrowing.DueAtUtc.AddDays(30), 0m));
        }

        // ---- Return ----

        [Fact]
        public void Return_on_time_closes_the_loan_without_penalty_and_frees_the_book()
        {
            var borrowing = OpenLoan(Now);
            var returnedAt = borrowing.DueAtUtc.AddDays(-1);

            borrowing.Return(returnedAt, PenaltyPerDay);

            Assert.True(borrowing.IsReturned);
            Assert.Equal(returnedAt, borrowing.ReturnedAtUtc);
            Assert.Equal(0m, borrowing.PenaltyAmount);
            Assert.Equal(BookStatus.Available, borrowing.Book.Status);
        }

        [Fact]
        public void Return_late_freezes_the_penalty()
        {
            var borrowing = OpenLoan(Now);
            var returnedAt = borrowing.DueAtUtc.AddDays(4).AddHours(1);

            borrowing.Return(returnedAt, PenaltyPerDay);

            Assert.Equal(5 * PenaltyPerDay, borrowing.PenaltyAmount);
            Assert.True(borrowing.IsOverdue(returnedAt.AddDays(30)));
        }

        [Fact]
        public void Return_twice_is_rejected_and_keeps_the_first_result()
        {
            var borrowing = OpenLoan(Now);
            var firstReturn = borrowing.DueAtUtc.AddDays(1);
            borrowing.Return(firstReturn, PenaltyPerDay);

            var exception = Assert.Throws<BorrowingException>(() => borrowing.Return(firstReturn.AddDays(5), PenaltyPerDay));

            Assert.Contains("already been returned", exception.Message);
            Assert.Equal(firstReturn, borrowing.ReturnedAtUtc);
            Assert.Equal(PenaltyPerDay, borrowing.PenaltyAmount);
        }

        [Theory]
        [InlineData(BookStatus.Lost)]
        [InlineData(BookStatus.Damaged)]
        public void Return_does_not_overwrite_a_status_set_while_the_book_was_out(BookStatus statusWhileOut)
        {
            var borrowing = OpenLoan(Now);
            borrowing.Book.TransitionTo(statusWhileOut);

            borrowing.Return(borrowing.DueAtUtc.AddDays(-1), PenaltyPerDay);

            Assert.Equal(statusWhileOut, borrowing.Book.Status);
        }

        [Fact]
        public void A_returned_book_can_be_borrowed_again()
        {
            var book = AvailableBook();
            var loan = Borrowing.Start(book, ActiveUser(), [AppRoles.Student], Now, LoanPeriod);
            loan.Return(Now.AddDays(1), PenaltyPerDay);

            var second = Borrowing.Start(book, ActiveUser(), [AppRoles.Visitor], Now.AddDays(2), LoanPeriod);

            Assert.Equal(BookStatus.Borrowed, book.Status);
            Assert.False(second.IsReturned);
        }
    }
}
