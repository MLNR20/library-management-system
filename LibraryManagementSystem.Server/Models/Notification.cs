using System.ComponentModel.DataAnnotations;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    public enum NotificationKind
    {
        // An open loan that falls due within the reminder window.
        DueSoon,

        // An open loan past its due date.
        Overdue
    }

    // An in-app message to one user about one loan. The reminder job writes at most one per loan, kind and day.
    public class Notification
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        public Guid BorrowingId { get; set; }

        public Borrowing Borrowing { get; set; } = null!;

        public NotificationKind Kind { get; set; }

        // The UTC day the reminder was written for; with BorrowingId and Kind it makes a reminder idempotent.
        public DateOnly Day { get; set; }

        [Required]
        [StringLength(500)]
        public string Message { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; }

        // Null until the user has seen it.
        public DateTime? ReadAtUtc { get; set; }

        // The reminder a loan needs as of nowUtc, or null when it needs none: already returned, or not due within
        // dueSoonDays. Overdue uses the same rule as everywhere else (BorrowingRules). Loan.Book must be loaded.
        public static Notification? ForLoan(Borrowing loan, DateTime nowUtc, int dueSoonDays)
        {
            if (loan.IsReturned)
            {
                return null;
            }

            var title = loan.Book.Title;
            var day = DateOnly.FromDateTime(nowUtc);

            if (BorrowingRules.IsOverdue(loan, nowUtc))
            {
                var days = loan.OverdueDays(nowUtc);

                return Create(loan, NotificationKind.Overdue, day, nowUtc,
                    $"'{title}' was due on {loan.DueAtUtc:yyyy-MM-dd} and is {days} {Plural(days)} overdue. Please return it as soon as you can.");
            }

            if (loan.DueAtUtc <= nowUtc.AddDays(dueSoonDays))
            {
                var daysLeft = (int)Math.Ceiling((loan.DueAtUtc - nowUtc).TotalDays);
                var when = daysLeft <= 1 ? "within a day" : $"in {daysLeft} days";

                return Create(loan, NotificationKind.DueSoon, day, nowUtc,
                    $"'{title}' is due {when}, on {loan.DueAtUtc:yyyy-MM-dd}.");
            }

            return null;
        }

        public void MarkRead(DateTime nowUtc) => ReadAtUtc ??= nowUtc;

        private static Notification Create(Borrowing loan, NotificationKind kind, DateOnly day, DateTime nowUtc, string message) => new()
        {
            Id = Guid.NewGuid(),
            UserId = loan.UserId,
            BorrowingId = loan.Id,
            Kind = kind,
            Day = day,
            Message = message,
            CreatedAtUtc = nowUtc
        };

        private static string Plural(int days) => days == 1 ? "day" : "days";
    }
}
