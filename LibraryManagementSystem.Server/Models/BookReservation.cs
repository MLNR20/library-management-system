using System.ComponentModel.DataAnnotations;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    public enum BookReservationStatus
    {
        // Held for the student; the book is Reserved and nobody else can borrow it.
        Reserved,

        // The student collected it; a Borrowing is open and the book is Borrowed.
        Borrowed,

        // The student says they brought it back; the book is ReturnPending until a librarian approves.
        ReturnRequested,

        // A librarian approved the return; the book is Available again.
        Returned,

        // Given up before it was collected, by the student or by staff.
        Cancelled
    }

    // One student's claim on one book, from reserving it to a librarian approving its return. While it is open
    // (Reserved, Borrowed or ReturnRequested) it is the only reservation for that book. Collecting it opens the Borrowing
    // that carries the due date and penalty; the Book's own status mirrors every step.
    public class BookReservation
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(450)]
        public string StudentId { get; set; } = string.Empty;

        public ApplicationUser Student { get; set; } = null!;

        public Guid BookId { get; set; }

        public Book Book { get; set; } = null!;

        public BookReservationStatus Status { get; set; } = BookReservationStatus.Reserved;

        public DateTime ReservedAtUtc { get; set; }

        // Set when the student collects it, together with the loan.
        public Guid? BorrowingId { get; set; }

        public Borrowing? Borrowing { get; set; }

        public DateTime? ReturnRequestedAtUtc { get; set; }

        // Set when a librarian approves the return.
        public DateTime? ReturnApprovedAtUtc { get; set; }

        [StringLength(256)]
        public string? ReturnApprovedByName { get; set; }

        public bool IsOpen => Status is BookReservationStatus.Reserved or BookReservationStatus.Borrowed or BookReservationStatus.ReturnRequested;

        // Holds an available book for a student. The same people may reserve as may borrow.
        public static BookReservation Reserve(Book book, ApplicationUser user, IEnumerable<string> roles, DateTime nowUtc)
        {
            Borrowing.EnsureCanBorrow(user, roles, nowUtc);

            if (book.Status != BookStatus.Available)
            {
                throw new BookReservationException($"'{book.Title}' cannot be reserved (it is {Book.Describe(book.Status)}).");
            }

            book.TransitionTo(BookStatus.Reserved);

            return new BookReservation
            {
                Id = Guid.NewGuid(),
                Book = book,
                BookId = book.Id,
                Student = user,
                StudentId = user.Id,
                ReservedAtUtc = nowUtc
            };
        }

        // Lets the book go before it is collected. Book must be loaded.
        public void Cancel()
        {
            if (Status != BookReservationStatus.Reserved)
            {
                throw new BookReservationException($"Only a reserved book can be cancelled; this one is {Status.ToString().ToLowerInvariant()}.");
            }

            Status = BookReservationStatus.Cancelled;

            if (Book.Status == BookStatus.Reserved)
            {
                Book.TransitionTo(BookStatus.Available);
            }
        }

        // The student collects the held book: it becomes a loan. Book and Student must be loaded.
        public Borrowing Collect(IEnumerable<string> roles, DateTime nowUtc, TimeSpan loanPeriod)
        {
            if (Status != BookReservationStatus.Reserved)
            {
                throw new BookReservationException($"Only a reserved book can be collected; this one is {Status.ToString().ToLowerInvariant()}.");
            }

            var borrowing = Borrowing.StartReserved(Book, Student, roles, nowUtc, loanPeriod);
            borrowing.Id = Guid.NewGuid();
            Borrowing = borrowing;
            BorrowingId = borrowing.Id;
            Status = BookReservationStatus.Borrowed;

            return borrowing;
        }

        // Mirrors Borrowing.RequestReturn; the service calls both.
        public void MarkReturnRequested(DateTime nowUtc)
        {
            Status = BookReservationStatus.ReturnRequested;
            ReturnRequestedAtUtc = nowUtc;
        }

        // Mirrors Borrowing.Return once a librarian approves.
        public void MarkReturned(string approverName, DateTime nowUtc)
        {
            Status = BookReservationStatus.Returned;
            ReturnApprovedAtUtc = nowUtc;
            ReturnApprovedByName = approverName;
        }
    }

    // A book reservation rule was broken (ineligible student, book not available, wrong status). A BorrowingException so
    // controllers answer it the same way.
    public class BookReservationException(string message) : BorrowingException(message);
}
