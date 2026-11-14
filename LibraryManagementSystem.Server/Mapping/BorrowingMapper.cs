using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Mapping
{
    // Hand-written because the overdue figures depend on the clock and the penalty rate. Book and User must be loaded.
    public static class BorrowingMapper
    {
        public static BorrowingDto ToDto(Borrowing borrowing, DateTime nowUtc, decimal penaltyPerDay) => new(
            borrowing.Id,
            borrowing.BookId,
            borrowing.Book.Title,
            borrowing.UserId,
            borrowing.User.UserName ?? borrowing.UserId,
            borrowing.BorrowedAtUtc,
            borrowing.DueAtUtc,
            borrowing.ReturnedAtUtc,
            borrowing.ReturnRequestedAtUtc,
            borrowing.Book.Status,
            StatusOf(borrowing),
            borrowing.IsOverdue(nowUtc),
            borrowing.OverdueDays(nowUtc),
            borrowing.IsReturned ? borrowing.PenaltyAmount : borrowing.CalculatePenalty(nowUtc, penaltyPerDay));

        // What the loan is, according to the book that was borrowed.
        public static BorrowingStatus StatusOf(Borrowing borrowing) =>
            borrowing.IsReturned
                ? BorrowingStatus.Returned
                : borrowing.Book.Status switch
                {
                    BookStatus.ReturnPending => BorrowingStatus.ReturnRequested,
                    BookStatus.Lost => BorrowingStatus.Lost,
                    BookStatus.Damaged => BorrowingStatus.Damaged,
                    _ => BorrowingStatus.Borrowed
                };
    }
}
