using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    public class Book
    {
        // Every status change goes through this table (TransitionTo), so a book can never reach a state the lending flow
        // does not allow. Borrowed, Reserved and ReturnPending are only entered by a loan or reservation; staff can only
        // move a book to Available, Lost or Damaged (ChangeCondition).
        private static readonly IReadOnlyDictionary<BookStatus, BookStatus[]> Transitions = new Dictionary<BookStatus, BookStatus[]>
        {
            [BookStatus.Available] = [BookStatus.Reserved, BookStatus.Borrowed, BookStatus.Lost, BookStatus.Damaged],
            [BookStatus.Reserved] = [BookStatus.Available, BookStatus.Borrowed, BookStatus.Lost, BookStatus.Damaged],
            [BookStatus.Borrowed] = [BookStatus.ReturnPending, BookStatus.Available, BookStatus.Lost, BookStatus.Damaged],
            [BookStatus.ReturnPending] = [BookStatus.Available, BookStatus.Lost, BookStatus.Damaged],
            [BookStatus.Lost] = [BookStatus.Available, BookStatus.Damaged],
            [BookStatus.Damaged] = [BookStatus.Available, BookStatus.Lost]
        };

        public Guid Id { get; set; }

        [Required]
        [StringLength(300)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(17)]
        public string Isbn { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Edition { get; set; }

        [Range(1, int.MaxValue)]
        public int Pages { get; set; }

        // Read-only from outside: change it with TransitionTo (lending flow) or ChangeCondition (staff).
        public BookStatus Status { get; private set; } = BookStatus.Available;

        // Optimistic concurrency token (SQL Server rowversion). Two people changing the same book at once cannot both win:
        // whoever saves second gets a DbUpdateConcurrencyException, answered with a 409.
        [Timestamp]
        public byte[] RowVersion { get; set; } = [];

        public DateOnly DateAcquired { get; set; }

        public Guid GenreId { get; set; }

        public Genre Genre { get; set; } = null!;

        public ICollection<Author> Authors { get; set; } = [];

        public ICollection<Language> Languages { get; set; } = [];

        // Where the book is shelved; a book can be spread over several rows.
        public ICollection<Row> Rows { get; set; } = [];

        public bool CanTransitionTo(BookStatus next) => Transitions[Status].Contains(next);

        // The one place the status changes. Throws BookStateException when the table does not allow the move.
        public void TransitionTo(BookStatus next)
        {
            if (!CanTransitionTo(next))
            {
                throw new BookStateException($"'{Title}' cannot go from {Describe(Status)} to {Describe(next)}.");
            }

            Status = next;
        }

        // A librarian sets the book's condition by hand (the edit form, or cataloguing a new book). Only Available, Lost
        // and Damaged can be chosen; the other states belong to the lending flow, and a book that is out or held cannot be
        // made Available until it is returned or the hold is cancelled.
        public void ChangeCondition(BookStatus target)
        {
            if (target == Status)
            {
                return;
            }

            if (target is not (BookStatus.Available or BookStatus.Lost or BookStatus.Damaged))
            {
                throw new BookStateException(
                    $"A book cannot be set to {Describe(target)} by hand; that happens when it is reserved, borrowed or returned.");
            }

            if (target == BookStatus.Available && Status is BookStatus.Reserved or BookStatus.Borrowed or BookStatus.ReturnPending)
            {
                throw new BookStateException(
                    $"'{Title}' is {Describe(Status)}; return it or cancel the reservation instead of marking it available.");
            }

            TransitionTo(target);
        }

        public static string Describe(BookStatus status) => status switch
        {
            BookStatus.ReturnPending => "waiting for its return to be approved",
            _ => status.ToString().ToLowerInvariant()
        };
    }

    // A book was asked to make a status change its state machine does not allow. A BorrowingException so the lending
    // controllers answer it with the same 409; everything else is caught by ConflictExceptionHandler.
    public class BookStateException(string message) : BorrowingException(message);
}
