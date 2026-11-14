using LibraryManagementSystem.Server.Dtos.BookReservations;
using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Services
{
    public interface IBookReservationService
    {
        // Newest first, at most 500. Staff see everyone's, optionally narrowed to one status; everyone else only their own.
        Task<IReadOnlyList<BookReservationDto>> GetAsync(
            string requesterId, bool isStaff, BookReservationStatus? status, CancellationToken cancellationToken = default);

        // Holds an available book for the requester. Throws KeyNotFoundException (book or user missing) and
        // BorrowingException (not an active Student/Visitor, or the book is not available).
        Task<BookReservationDto> ReserveAsync(string requesterId, BookReservationRequest request, CancellationToken cancellationToken = default);

        // Returns null when the reservation does not exist. Throws UnauthorizedAccessException when a non-staff user
        // touches another user's reservation, and BorrowingException when its status does not allow it.
        Task<BookReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default);

        // The student collects the held book, which opens the loan. The loan comes back too so it can be pushed live.
        Task<(BookReservationDto Reservation, BorrowingDto Borrowing)?> CollectAsync(
            Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default);
    }
}
