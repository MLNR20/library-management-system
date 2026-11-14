using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.BookReservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Students reserve a book, collect it and cancel; asking to give it back, and a librarian approving that return, go
    // through the loan (POST api/borrowings/{borrowingId}/return and .../approve-return). Staff see every reservation.
    // What a reservation may do is enforced by BookReservation.
    [ApiController]
    [Authorize]
    [Route("api/book-reservations")]
    public class BookReservationsController(IBookReservationService reservations, IBorrowingNotifier notifier) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<BookReservationDto>>> GetAll(
            [FromQuery] BookReservationStatus? status, CancellationToken cancellationToken) =>
            Ok(await reservations.GetAsync(CurrentUserId(), IsStaff(), status, cancellationToken));

        [HttpPost]
        public async Task<ActionResult<BookReservationDto>> Reserve(BookReservationRequest request, CancellationToken cancellationToken)
        {
            try
            {
                return Ok(await reservations.ReserveAsync(CurrentUserId(), request, cancellationToken));
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

        [HttpPost("{id:guid}/cancel")]
        public async Task<ActionResult<BookReservationDto>> Cancel(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var reservation = await reservations.CancelAsync(id, CurrentUserId(), IsStaff(), cancellationToken);

                return reservation is null ? NotFound() : Ok(reservation);
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

        // The student picks the held book up; this opens the loan.
        [HttpPost("{id:guid}/collect")]
        public async Task<ActionResult<BookReservationDto>> Collect(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                var result = await reservations.CollectAsync(id, CurrentUserId(), IsStaff(), cancellationToken);
                if (result is null)
                {
                    return NotFound();
                }

                await notifier.BorrowingChangedAsync(result.Value.Borrowing, cancellationToken);

                return Ok(result.Value.Reservation);
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

        private bool IsStaff() => User.IsInRole(AppRoles.Administrator) || User.IsInRole(AppRoles.Librarian);

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
