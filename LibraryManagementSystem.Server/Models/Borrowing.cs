using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Models
{
    // One loan of one book to one user. A book has at most one open loan (ReturnedAtUtc is null) at a time.
    public class Borrowing
    {
        public Guid Id { get; set; }

        public Guid BookId { get; set; }

        public Book Book { get; set; } = null!;

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        public DateTime BorrowedAtUtc { get; set; }

        // When the book must be back; anything later accrues a penalty.
        public DateTime DueAtUtc { get; set; }

        // Null while the book is still out.
        public DateTime? ReturnedAtUtc { get; set; }

        // Final penalty once returned; while the book is out it is the last amount the overdue monitor wrote.
        [Range(0, double.MaxValue)]
        public decimal PenaltyAmount { get; set; }

        [NotMapped]
        public bool IsReturned => ReturnedAtUtc is not null;

        // Only these may borrow: an active, unlocked user holding the Student or Visitor role.
        public static void EnsureCanBorrow(ApplicationUser user, IEnumerable<string> roles, DateTime nowUtc)
        {
            if (!user.IsActive)
            {
                throw new BorrowingException("This account is not active and cannot borrow books.");
            }

            if (user.LockoutEnabled && user.LockoutEnd is { } lockoutEnd && lockoutEnd > nowUtc)
            {
                throw new BorrowingException("This account is locked and cannot borrow books.");
            }

            if (!roles.Any(role => AppRoles.Borrowers.Contains(role, StringComparer.OrdinalIgnoreCase)))
            {
                throw new BorrowingException(
                    $"Only users with the {AppRoles.Student} or {AppRoles.Visitor} role can borrow books.");
            }
        }

        // Validates the borrower and the book, marks the book as borrowed and returns the open loan.
        public static Borrowing Start(Book book, ApplicationUser user, IEnumerable<string> roles, DateTime nowUtc, TimeSpan loanPeriod)
        {
            EnsureCanBorrow(user, roles, nowUtc);

            // A book is active (borrowable) only while Available; borrowed, reserved, lost and damaged copies are not.
            if (book.Status != BookStatus.Available)
            {
                throw new BorrowingException($"'{book.Title}' is not active and cannot be borrowed (it is {book.Status.ToString().ToLowerInvariant()}).");
            }

            book.Status = BookStatus.Borrowed;

            return new Borrowing
            {
                Book = book,
                BookId = book.Id,
                User = user,
                UserId = user.Id,
                BorrowedAtUtc = nowUtc,
                DueAtUtc = nowUtc + loanPeriod
            };
        }

        // Closes the loan, freezes the penalty and makes the book available again. Book must be loaded.
        public void Return(DateTime nowUtc, decimal penaltyPerDay)
        {
            if (IsReturned)
            {
                throw new BorrowingException("This book has already been returned.");
            }

            ReturnedAtUtc = nowUtc;
            PenaltyAmount = CalculatePenalty(nowUtc, penaltyPerDay);

            if (Book.Status == BookStatus.Borrowed)
            {
                Book.Status = BookStatus.Available;
            }
        }

        // Whole days past the due date, counting a started day as a full one; zero when on time.
        // A returned loan is measured to the return time, an open one to asOfUtc.
        public int OverdueDays(DateTime asOfUtc)
        {
            var end = ReturnedAtUtc ?? asOfUtc;

            return end <= DueAtUtc ? 0 : (int)Math.Ceiling((end - DueAtUtc).TotalDays);
        }

        public bool IsOverdue(DateTime asOfUtc) => OverdueDays(asOfUtc) > 0;

        public decimal CalculatePenalty(DateTime asOfUtc, decimal penaltyPerDay) => OverdueDays(asOfUtc) * penaltyPerDay;
    }

    // A borrowing rule was broken (ineligible borrower, book not available, already returned).
    public class BorrowingException(string message) : InvalidOperationException(message);
}
