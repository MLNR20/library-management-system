using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Tests.Models
{
    public class BookStateMachineTests
    {
        private static Book BookIn(BookStatus status)
        {
            // Walks the table from Available, so a test never bypasses it. ReturnPending is the only state two moves away.
            var book = new Book { Id = Guid.NewGuid(), Title = "Dune" };
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

        public static TheoryData<BookStatus, BookStatus> AllowedMoves() => Pairs(
            (BookStatus.Available, BookStatus.Reserved),
            (BookStatus.Available, BookStatus.Borrowed),
            (BookStatus.Available, BookStatus.Lost),
            (BookStatus.Available, BookStatus.Damaged),
            (BookStatus.Reserved, BookStatus.Available),
            (BookStatus.Reserved, BookStatus.Borrowed),
            (BookStatus.Reserved, BookStatus.Lost),
            (BookStatus.Reserved, BookStatus.Damaged),
            (BookStatus.Borrowed, BookStatus.ReturnPending),
            (BookStatus.Borrowed, BookStatus.Available),
            (BookStatus.Borrowed, BookStatus.Lost),
            (BookStatus.Borrowed, BookStatus.Damaged),
            (BookStatus.ReturnPending, BookStatus.Available),
            (BookStatus.ReturnPending, BookStatus.Lost),
            (BookStatus.ReturnPending, BookStatus.Damaged),
            (BookStatus.Lost, BookStatus.Available),
            (BookStatus.Lost, BookStatus.Damaged),
            (BookStatus.Damaged, BookStatus.Available),
            (BookStatus.Damaged, BookStatus.Lost));

        public static TheoryData<BookStatus, BookStatus> ForbiddenMoves() => Pairs(
            (BookStatus.Available, BookStatus.ReturnPending),
            (BookStatus.Reserved, BookStatus.ReturnPending),
            (BookStatus.ReturnPending, BookStatus.Reserved),
            (BookStatus.ReturnPending, BookStatus.Borrowed),
            (BookStatus.Borrowed, BookStatus.Reserved),
            (BookStatus.Lost, BookStatus.Reserved),
            (BookStatus.Lost, BookStatus.Borrowed),
            (BookStatus.Lost, BookStatus.ReturnPending),
            (BookStatus.Damaged, BookStatus.Reserved),
            (BookStatus.Damaged, BookStatus.Borrowed),
            (BookStatus.Damaged, BookStatus.ReturnPending));

        private static TheoryData<BookStatus, BookStatus> Pairs(params (BookStatus From, BookStatus To)[] pairs)
        {
            var data = new TheoryData<BookStatus, BookStatus>();
            foreach (var (from, to) in pairs)
            {
                data.Add(from, to);
            }

            return data;
        }

        [Fact]
        public void A_new_book_is_available()
        {
            Assert.Equal(BookStatus.Available, new Book().Status);
        }

        [Fact]
        public void The_table_covers_every_pair_of_states_exactly_once()
        {
            var statuses = Enum.GetValues<BookStatus>();
            var covered = AllowedMoves().Select(row => ((BookStatus)row[0], (BookStatus)row[1]))
                .Concat(ForbiddenMoves().Select(row => ((BookStatus)row[0], (BookStatus)row[1])))
                .Concat(statuses.Select(status => (status, status)))
                .ToList();

            // Staying put is never a transition, so the three lists together account for all 6 x 6 pairs.
            Assert.Equal(statuses.Length * statuses.Length, covered.Count);
            Assert.Equal(covered.Count, covered.Distinct().Count());
        }

        [Theory]
        [MemberData(nameof(AllowedMoves))]
        public void TransitionTo_allows_the_moves_in_the_table(BookStatus from, BookStatus to)
        {
            var book = BookIn(from);

            Assert.True(book.CanTransitionTo(to));
            book.TransitionTo(to);

            Assert.Equal(to, book.Status);
        }

        [Theory]
        [MemberData(nameof(ForbiddenMoves))]
        public void TransitionTo_rejects_the_rest_and_leaves_the_status_alone(BookStatus from, BookStatus to)
        {
            var book = BookIn(from);

            Assert.False(book.CanTransitionTo(to));
            var exception = Assert.Throws<BookStateException>(() => book.TransitionTo(to));

            Assert.Contains("Dune", exception.Message);
            Assert.Equal(from, book.Status);
        }

        [Theory]
        [InlineData(BookStatus.Available)]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.Lost)]
        public void TransitionTo_rejects_staying_in_the_same_state(BookStatus status)
        {
            var book = BookIn(status);

            Assert.Throws<BookStateException>(() => book.TransitionTo(status));
        }

        // ---- ChangeCondition (what a librarian can do by hand) ----

        [Theory]
        [InlineData(BookStatus.Available, BookStatus.Lost)]
        [InlineData(BookStatus.Available, BookStatus.Damaged)]
        [InlineData(BookStatus.Lost, BookStatus.Available)]
        [InlineData(BookStatus.Damaged, BookStatus.Available)]
        [InlineData(BookStatus.Borrowed, BookStatus.Lost)]
        [InlineData(BookStatus.Reserved, BookStatus.Damaged)]
        [InlineData(BookStatus.ReturnPending, BookStatus.Lost)]
        public void ChangeCondition_allows_available_lost_and_damaged_where_the_table_does(BookStatus from, BookStatus to)
        {
            var book = BookIn(from);

            book.ChangeCondition(to);

            Assert.Equal(to, book.Status);
        }

        [Theory]
        [InlineData(BookStatus.Available)]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.Lost)]
        public void ChangeCondition_to_the_current_status_does_nothing(BookStatus status)
        {
            var book = BookIn(status);

            book.ChangeCondition(status);

            Assert.Equal(status, book.Status);
        }

        [Theory]
        [InlineData(BookStatus.Reserved)]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.ReturnPending)]
        public void ChangeCondition_cannot_set_the_states_that_belong_to_lending(BookStatus target)
        {
            var book = BookIn(BookStatus.Available);

            var exception = Assert.Throws<BookStateException>(() => book.ChangeCondition(target));

            Assert.Contains("by hand", exception.Message);
            Assert.Equal(BookStatus.Available, book.Status);
        }

        [Theory]
        [InlineData(BookStatus.Reserved)]
        [InlineData(BookStatus.Borrowed)]
        [InlineData(BookStatus.ReturnPending)]
        public void ChangeCondition_cannot_make_a_held_or_lent_book_available(BookStatus from)
        {
            var book = BookIn(from);

            var exception = Assert.Throws<BookStateException>(() => book.ChangeCondition(BookStatus.Available));

            Assert.Contains("return it or cancel", exception.Message);
            Assert.Equal(from, book.Status);
        }

        // ---- The lending flow only ever uses legal moves ----

        [Fact]
        public void A_full_loan_walks_available_borrowed_return_pending_available()
        {
            var book = BookIn(BookStatus.Available);
            var user = new Server.Data.ApplicationUser { Id = "u1", UserName = "reader", IsActive = true };
            var now = new DateTime(2026, 11, 14, 9, 0, 0, DateTimeKind.Utc);

            var loan = Borrowing.Start(book, user, ["Student"], now, TimeSpan.FromDays(14));
            Assert.Equal(BookStatus.Borrowed, book.Status);

            loan.RequestReturn(now.AddDays(1));
            Assert.Equal(BookStatus.ReturnPending, book.Status);

            loan.Return(now.AddDays(1), 0.5m);
            Assert.Equal(BookStatus.Available, book.Status);
        }

        [Fact]
        public void A_reservation_walks_available_reserved_borrowed()
        {
            var book = BookIn(BookStatus.Available);
            var user = new Server.Data.ApplicationUser { Id = "u1", UserName = "reader", IsActive = true };
            var now = new DateTime(2026, 11, 14, 9, 0, 0, DateTimeKind.Utc);

            var reservation = BookReservation.Reserve(book, user, ["Student"], now);
            Assert.Equal(BookStatus.Reserved, book.Status);

            reservation.Collect(["Student"], now, TimeSpan.FromDays(14));
            Assert.Equal(BookStatus.Borrowed, book.Status);
        }

        [Fact]
        public void A_cancelled_reservation_makes_the_book_available_again()
        {
            var book = BookIn(BookStatus.Available);
            var user = new Server.Data.ApplicationUser { Id = "u1", UserName = "reader", IsActive = true };

            var reservation = BookReservation.Reserve(book, user, ["Student"], DateTime.UtcNow);
            reservation.Cancel();

            Assert.Equal(BookStatus.Available, book.Status);
        }
    }
}
