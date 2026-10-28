using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Filters
{
    // Turns a SQL Server unique-index violation (duplicate ISBN, genre name, ...) into a 409 instead of a 500.
    public class UniqueConstraintExceptionHandler : IExceptionHandler
    {
        private const int DuplicateKeyIndex = 2601;
        private const int DuplicateKeyConstraint = 2627;

        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            if (exception is not DbUpdateException { InnerException: SqlException { Number: DuplicateKeyIndex or DuplicateKeyConstraint } })
            {
                return false;
            }

            await Results
                .Problem(statusCode: StatusCodes.Status409Conflict, detail: "A record with the same unique value already exists.")
                .ExecuteAsync(httpContext);

            return true;
        }
    }
}
