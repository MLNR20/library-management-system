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

        // The borrower (or staff for them) says the book is back; the book becomes ReturnPending and a librarian must approve.
        // Returns null when the loan does not exist. Throws UnauthorizedAccessException when a non-staff user asks for
        // someone else's loan, and BorrowingException when it was already returned or already requested.
        Task<BorrowingDto?> RequestReturnAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default);

        // A librarian approves the return: the loan closes, the penalty freezes (as of the request, so waiting for the
        // librarian costs the borrower nothing) and the book is available again. Staff may also take a book back that
        // was never requested. Returns null when the loan does not exist; BorrowingException when already returned.
        Task<BorrowingDto?> ApproveReturnAsync(Guid id, string approverName, CancellationToken cancellationToken = default);

        // Recalculates the penalty of every open overdue loan and returns the ones whose amount changed.
        Task<IReadOnlyList<BorrowingDto>> RefreshPenaltiesAsync(CancellationToken cancellationToken = default);
    }
}
