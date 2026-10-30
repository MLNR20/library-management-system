using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Settings
{
    // Bound from the "Borrowing" configuration section.
    public class BorrowingSettings
    {
        public const string SectionName = "Borrowing";

        // How long a borrower may keep a book before it is due.
        [Range(1, 365)]
        public int LoanPeriodDays { get; set; } = 14;

        // Charged for every day (a started day counts) the book is kept past its due date.
        [Range(0, 10000)]
        public decimal PenaltyPerDay { get; set; } = 1.00m;

        // How often the overdue monitor recalculates penalties and pushes changes over SignalR.
        [Range(5, 86400)]
        public int PenaltyCheckSeconds { get; set; } = 60;
    }
}
