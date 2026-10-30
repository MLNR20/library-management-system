using LibraryManagementSystem.Server.Dtos.Borrowings;

namespace LibraryManagementSystem.Server.Services
{
    public interface IBorrowingService
    {
        // Newest first, at most 500. Administrators (allUsers) see everyone's loans, optionally narrowed to one userId;
        // everyone else only ever gets their own and userId is ignored.
        Task<IReadOnlyList<BorrowingDto>> GetAsync(
            string requesterId, bool allUsers, string? userId, BorrowingFilter filter, CancellationToken cancellationToken = default);

        // Lends the book to request.UserId, or to the requester when that is empty. Throws KeyNotFoundException when the
        // book or user does not exist, and BorrowingException when the user is not an active Student/Visitor or the
        // book is not active (available).
        Task<BorrowingDto> BorrowAsync(string requesterId, BorrowRequest request, CancellationToken cancellationToken = default);

        // Returns null when the loan does not exist. Throws UnauthorizedAccessException when a non-administrator returns
        // someone else's loan, and BorrowingException when it was already returned.
        Task<BorrowingDto?> ReturnAsync(Guid id, string requesterId, bool isAdministrator, CancellationToken cancellationToken = default);

        // Recalculates the penalty of every open overdue loan and returns the ones whose amount changed.
        Task<IReadOnlyList<BorrowingDto>> RefreshPenaltiesAsync(CancellationToken cancellationToken = default);
    }
}
