using LibraryManagementSystem.Server.Models;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Filters
{
    // Two kinds of "someone got there first" answer 409 instead of a 500:
    //  - DbUpdateConcurrencyException: another request changed the same row (the book's RowVersion no longer matches),
    //    for example two students borrowing the last copy at the same moment. The loser has to reload and try again.
    //  - BookStateException: the book's state machine does not allow the move (see Book.TransitionTo), for example a
    //    librarian marking a borrowed book available.
    public class ConflictExceptionHandler : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            var detail = exception switch
            {
                DbUpdateConcurrencyException =>
                    "This record was changed by someone else while you were working on it. Reload it and try again.",
                BookStateException state => state.Message,
                _ => null
            };

            if (detail is null)
            {
                return false;
            }

            await Results.Problem(statusCode: StatusCodes.Status409Conflict, detail: detail).ExecuteAsync(httpContext);

            return true;
        }
    }
}
