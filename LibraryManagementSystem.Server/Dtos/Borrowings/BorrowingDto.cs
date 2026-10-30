namespace LibraryManagementSystem.Server.Dtos.Borrowings
{
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
        bool IsOverdue,
        int OverdueDays,
        decimal PenaltyAmount);

    // UserId is for administrators lending on someone's behalf; everyone else borrows for themselves and may leave it out.
    public record BorrowRequest(Guid BookId, string? UserId);

    public enum BorrowingFilter
    {
        All,
        Active,
        Overdue,
        Returned
    }
}
