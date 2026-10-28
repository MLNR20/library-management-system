using LibraryManagementSystem.Server.Services;

namespace LibraryManagementSystem.Server.Filters
{
    // Identity rejected an operation (duplicate or invalid role name, ...): answer 400 with its messages instead of a 500.
    public class IdentityExceptionHandler : Microsoft.AspNetCore.Diagnostics.IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            if (exception is not IdentityException identity)
            {
                return false;
            }

            var errors = identity.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

            await Results.ValidationProblem(errors).ExecuteAsync(httpContext);

            return true;
        }
    }
}
