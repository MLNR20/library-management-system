using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Students and visitors borrow for themselves and ask to return; librarians and administrators see every loan and approve
    // returns. Administrators may also lend for anyone.
    // Whether the borrower may borrow at all (active, Student/Visitor role) is enforced by the Borrowing model.
    [ApiController]
    [Authorize]
    [Route("api/borrowings")]
    public class BorrowingsController(IBorrowingService borrowings, IBorrowingNotifier notifier) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<BorrowingDto>>> GetAll(
            [FromQuery] BorrowingFilter filter, [FromQuery] string? userId, CancellationToken cancellationToken) =>
            Ok(await borrowings.GetAsync(CurrentUserId(), IsStaff(), userId, filter, cancellationToken));

        [HttpPost]
        public async Task<ActionResult<BorrowingDto>> Borrow(BorrowRequest request, CancellationToken cancellationToken)
        {
            if (!IsAdministrator() && !string.IsNullOrWhiteSpace(request.UserId) && request.UserId != CurrentUserId())
            {
                return Forbid();
            }

            try
            {
                var borrowing = await borrowings.BorrowAsync(CurrentUserId(), request, cancellationToken);
                await notifier.BorrowingChangedAsync(borrowing, cancellationToken);

                return Ok(borrowing);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status404NotFound, detail: ex.Message);
            }
            catch (BorrowingException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        // The borrower says the book is back. It is not returned until a librarian approves (approve-return).
        [HttpPost("{id:guid}/return")]
        public Task<ActionResult<BorrowingDto>> RequestReturn(Guid id, CancellationToken cancellationToken) =>
            RunAsync(() => borrowings.RequestReturnAsync(id, CurrentUserId(), IsStaff(), cancellationToken));

        [HttpPost("{id:guid}/approve-return")]
        [Authorize(Roles = AppRoles.Staff)]
        public Task<ActionResult<BorrowingDto>> ApproveReturn(Guid id, CancellationToken cancellationToken) =>
            RunAsync(() => borrowings.ApproveReturnAsync(id, CurrentUserName(), cancellationToken));

        private async Task<ActionResult<BorrowingDto>> RunAsync(Func<Task<BorrowingDto?>> action)
        {
            try
            {
                var borrowing = await action();
                if (borrowing is null)
                {
                    return NotFound();
                }

                await notifier.BorrowingChangedAsync(borrowing);

                return Ok(borrowing);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (BorrowingException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        private bool IsAdministrator() => User.IsInRole(AppRoles.Administrator);

        private bool IsStaff() => IsAdministrator() || User.IsInRole(AppRoles.Librarian);

        private string CurrentUserName() =>
            User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? CurrentUserId();

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
