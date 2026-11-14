using LibraryManagementSystem.Server.Dtos.BookReservations;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Mapping
{
    // Hand-written because the due date lives on the loan. Book and Student must be loaded (and Borrowing when there is one).
    public static class BookReservationMapper
    {
        public static BookReservationDto ToDto(BookReservation reservation, DateTime? nowUtc = null) => new(
            reservation.Id,
            reservation.StudentId,
            reservation.Student.UserName ?? reservation.StudentId,
            reservation.BookId,
            reservation.Book.Title,
            reservation.Book.Status,
            reservation.Status,
            reservation.ReservedAtUtc,
            reservation.BorrowingId,
            reservation.Borrowing?.DueAtUtc,
            reservation.Borrowing is { IsReturned: false } loan && loan.IsOverdue(nowUtc ?? DateTime.UtcNow),
            reservation.ReturnRequestedAtUtc,
            reservation.ReturnApprovedAtUtc,
            reservation.ReturnApprovedByName);
    }
}
