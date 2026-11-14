using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class BookReservationTests
    {
        private static readonly DateTime Now = new(2026, 11, 7, 12, 0, 0, DateTimeKind.Utc);
        private static readonly TimeSpan LoanPeriod = TimeSpan.FromDays(14);
        private const decimal PenaltyPerDay = 0.50m;

        private static ApplicationUser Student() => new() { Id = "student-1", UserName = "reader", IsActive = true };

        private static Book AvailableBook() => new() { Id = Guid.NewGuid(), Title = "Dune" };

        // A book in the given status, reached the way the lending flow would reach it.
        private static Book BookIn(BookStatus status)
        {
            var book = AvailableBook();
            if (status == BookStatus.ReturnPending)
            {
                book.TransitionTo(BookStatus.Borrowed);
            }

            if (status != BookStatus.Available)
            {
                book.TransitionTo(status);
            }

            return book;
        }

        private static BookReservation Reserved(Book? book = null) =>
            BookReservation.Reserve(book ?? AvailableBook(), Student(), [AppRoles.Student], Now);

        // A reservation the student has collected, so its book is out on loan.
        private static (BookReservation Reservation, Borrowing Borrowing) Collected()
        {
            var reservation = Reserved();
            var borrowing = reservation.Collect([AppRoles.Student], Now.AddDays(1), LoanPeriod);

            return (reservation, borrowing);
        }

        // ---- Reserve ----

        [Fact]
        public void Reserve_holds_an_available_book_for_the_student()
        {
            var book = AvailableBook();

            var reservation = BookReservation.Reserve(book, Student(), [AppRoles.Student], Now);

            Assert.Equal(BookReservationStatus.Reserved, reservation.Status);
            Assert.Equal("student-1", reservation.StudentId);
            Assert.Equal(book.Id, reservation.BookId);
            Assert.Equal(Now, reservation.ReservedAtUtc);
            Assert.Equal(BookStatus.Reserved, book.Status);
            Assert.True(reservation.IsOpen);
        }

        [Theory]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.Reserved)]
        [InlineData(BookStatus.Lost)]
        [InlineData(BookStatus.Damaged)]
        [InlineData(BookStatus.ReturnPending)]
        public void Reserve_rejects_a_book_that_is_not_available(BookStatus status)
        {
            var book = BookIn(status);

            Assert.Throws<BookReservationException>(() => BookReservation.Reserve(book, Student(), [AppRoles.Student], Now));
            Assert.Equal(status, book.Status);
        }

        [Fact]
        public void Reserve_rejects_someone_who_may_not_borrow()
        {
            var book = AvailableBook();

            Assert.Throws<BorrowingException>(() => BookReservation.Reserve(book, Student(), [AppRoles.Librarian], Now));
            Assert.Equal(BookStatus.Available, book.Status);
        }

        // ---- Cancel ----

        [Fact]
        public void Cancel_lets_the_book_go()
        {
            var book = AvailableBook();
            var reservation = Reserved(book);

            reservation.Cancel();

            Assert.Equal(BookReservationStatus.Cancelled, reservation.Status);
            Assert.Equal(BookStatus.Available, book.Status);
            Assert.False(reservation.IsOpen);
        }

        [Fact]
        public void Cancel_is_rejected_once_the_book_was_collected()
        {
            var (reservation, _) = Collected();

            Assert.Throws<BookReservationException>(reservation.Cancel);
            Assert.Equal(BookReservationStatus.Borrowed, reservation.Status);
        }

        // ---- Collect ----

        [Fact]
        public void Collect_opens_a_loan_and_marks_the_book_borrowed()
        {
            var reservation = Reserved();

            var borrowing = reservation.Collect([AppRoles.Student], Now.AddDays(1), LoanPeriod);

            Assert.Equal(BookReservationStatus.Borrowed, reservation.Status);
            Assert.Equal(borrowing.Id, reservation.BorrowingId);
            Assert.Equal(BookStatus.Borrowed, reservation.Book.Status);
            Assert.Equal(Now.AddDays(1) + LoanPeriod, borrowing.DueAtUtc);
            Assert.Equal("student-1", borrowing.UserId);
        }

        [Fact]
        public void Collect_twice_is_rejected()
        {
            var (reservation, _) = Collected();

            Assert.Throws<BookReservationException>(() => reservation.Collect([AppRoles.Student], Now.AddDays(2), LoanPeriod));
        }

        // ---- Return requested, then approved by a librarian ----

        [Fact]
        public void RequestReturn_keeps_the_loan_open_and_makes_the_book_return_pending()
        {
            var (reservation, borrowing) = Collected();
            var requestedAt = Now.AddDays(5);

            borrowing.RequestReturn(requestedAt);
            reservation.MarkReturnRequested(requestedAt);

            Assert.False(borrowing.IsReturned);
            Assert.Equal(requestedAt, borrowing.ReturnRequestedAtUtc);
            Assert.Equal(BookStatus.ReturnPending, borrowing.Book.Status);
            Assert.Equal(BookReservationStatus.ReturnRequested, reservation.Status);
        }

        [Fact]
        public void RequestReturn_twice_is_rejected()
        {
            var (_, borrowing) = Collected();
            borrowing.RequestReturn(Now.AddDays(5));

            var exception = Assert.Throws<BorrowingException>(() => borrowing.RequestReturn(Now.AddDays(6)));

            Assert.Contains("already been requested", exception.Message);
        }

        [Fact]
        public void RequestReturn_after_the_loan_was_returned_is_rejected()
        {
            var (_, borrowing) = Collected();
            borrowing.Return(Now.AddDays(5), PenaltyPerDay);

            Assert.Throws<BorrowingException>(() => borrowing.RequestReturn(Now.AddDays(6)));
        }

        [Fact]
        public void Approving_the_return_closes_the_loan_and_frees_the_book()
        {
            var (reservation, borrowing) = Collected();
            borrowing.RequestReturn(Now.AddDays(5));
            reservation.MarkReturnRequested(Now.AddDays(5));
            var approvedAt = Now.AddDays(6);

            borrowing.Return(borrowing.ReturnRequestedAtUtc!.Value, PenaltyPerDay);
            reservation.MarkReturned("Librarian Lee", approvedAt);

            Assert.True(borrowing.IsReturned);
            Assert.Equal(BookStatus.Available, borrowing.Book.Status);
            Assert.Equal(BookReservationStatus.Returned, reservation.Status);
            Assert.Equal(approvedAt, reservation.ReturnApprovedAtUtc);
            Assert.Equal("Librarian Lee", reservation.ReturnApprovedByName);
            Assert.False(reservation.IsOpen);
        }

        [Fact]
        public void A_late_return_is_charged_up_to_the_request_not_the_approval()
        {
            var (_, borrowing) = Collected();
            var requestedAt = borrowing.DueAtUtc.AddDays(2);
            borrowing.RequestReturn(requestedAt);

            // The librarian gets to it a week later; the student pays only for the days until they asked.
            borrowing.Return(borrowing.ReturnRequestedAtUtc!.Value, PenaltyPerDay);

            Assert.Equal(2 * PenaltyPerDay, borrowing.PenaltyAmount);
        }

        // ---- A loan's status follows the status of its book ----

        [Fact]
        public void A_loans_status_follows_the_status_of_its_book()
        {
            var (_, borrowing) = Collected();
            Assert.Equal(BorrowingStatus.Borrowed, BorrowingMapper.StatusOf(borrowing));

            borrowing.RequestReturn(Now.AddDays(5));
            Assert.Equal(BorrowingStatus.ReturnRequested, BorrowingMapper.StatusOf(borrowing));

            borrowing.Return(Now.AddDays(5), PenaltyPerDay);
            Assert.Equal(BorrowingStatus.Returned, BorrowingMapper.StatusOf(borrowing));
        }

        [Theory]
        [InlineData(BookStatus.Lost, BorrowingStatus.Lost)]
        [InlineData(BookStatus.Damaged, BorrowingStatus.Damaged)]
        public void A_lost_or_damaged_book_shows_on_its_open_loan(BookStatus bookStatus, BorrowingStatus expected)
        {
            var (_, borrowing) = Collected();
            borrowing.Book.TransitionTo(bookStatus);

            Assert.Equal(expected, BorrowingMapper.StatusOf(borrowing));
        }
    }
}
