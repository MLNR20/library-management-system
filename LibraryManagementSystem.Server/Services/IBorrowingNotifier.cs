using LibraryManagementSystem.Server.Dtos.Borrowings;

namespace LibraryManagementSystem.Server.Services
{
    // Pushes loan events to the borrower and to administrators in real time.
    public interface IBorrowingNotifier
    {
        // A loan was opened or returned.
        Task BorrowingChangedAsync(BorrowingDto borrowing, CancellationToken cancellationToken = default);

        // An overdue loan's penalty changed.
        Task PenaltyUpdatedAsync(BorrowingDto borrowing, CancellationToken cancellationToken = default);
    }
}
