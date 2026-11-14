using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.BookReservations
{
    // BookStatus is the reserved book's own status, always current: it is what a client shows next to Status and what
    // decides which actions are offered (cancel/collect while Reserved, request return while Borrowed, approve while ReturnPending).
    public record BookReservationDto(
        Guid Id,
        string StudentId,
        string StudentName,
        Guid BookId,
        string BookTitle,
        BookStatus BookStatus,
        BookReservationStatus Status,
        DateTime ReservedAtUtc,
        Guid? BorrowingId,
        DateTime? DueAtUtc,
        bool IsOverdue,
        DateTime? ReturnRequestedAtUtc,
        DateTime? ReturnApprovedAtUtc,
        string? ReturnApprovedByName);

    // Students reserve for themselves.
    public record BookReservationRequest(Guid BookId);
}
