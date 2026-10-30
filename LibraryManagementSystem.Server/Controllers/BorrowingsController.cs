using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Students and visitors borrow for themselves; administrators see every loan and may lend or return for anyone.
    // Whether the borrower may borrow at all (active, Student/Visitor role) is enforced by the Borrowing model.
    [ApiController]
    [Authorize]
    [Route("api/borrowings")]
    public class BorrowingsController(IBorrowingService borrowings, IBorrowingNotifier notifier) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<BorrowingDto>>> GetAll(
            [FromQuery] BorrowingFilter filter, [FromQuery] string? userId, CancellationToken cancellationToken) =>
            Ok(await borrowings.GetAsync(CurrentUserId(), IsAdministrator(), userId, filter, cancellationToken));

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

        [HttpPost("{id:guid}/return")]
        public async Task<ActionResult<BorrowingDto>> Return(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var borrowing = await borrowings.ReturnAsync(id, CurrentUserId(), IsAdministrator(), cancellationToken);
                if (borrowing is null)
                {
                    return NotFound();
                }

                await notifier.BorrowingChangedAsync(borrowing, cancellationToken);

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

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
