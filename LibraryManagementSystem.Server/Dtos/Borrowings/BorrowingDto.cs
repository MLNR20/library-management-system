using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Borrowings
{
    // Status is read off the borrowed book's own status, so what a loan shows (and which actions it offers) always follows
    // the book: Borrowed -> may request return; ReturnPending -> waits for a librarian; returned -> done.
    // PenaltyAmount for an open loan is worked out as of the moment the DTO was built, so it is always current.
    public record BorrowingDto(
        Guid Id,
        Guid BookId,
        string BookTitle,
        string UserId,
        string UserName,
        DateTime BorrowedAtUtc,
        DateTime DueAtUtc,
        DateTime? ReturnedAtUtc,
        DateTime? ReturnRequestedAtUtc,
        BookStatus BookStatus,
        BorrowingStatus Status,
        bool IsOverdue,
        int OverdueDays,
        decimal PenaltyAmount);

    // UserId is for administrators lending on someone's behalf; everyone else borrows for themselves and may leave it out.
    public record BorrowRequest(Guid BookId, string? UserId);

    public enum BorrowingStatus
    {
        Borrowed,
        ReturnRequested,
        Returned,
        Lost,
        Damaged
    }

    public enum BorrowingFilter
    {
        All,
        Active,
        Overdue,
        Returned
    }
}
