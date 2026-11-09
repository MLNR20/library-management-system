using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Students and visitors file requests and see their own; librarians and administrators see every request and decide them.
    // What a request may be for (active table, future slot, no clash on approval) is enforced by TableReservation.
    [ApiController]
    [Authorize]
    [Route("api/table-reservations")]
    public class TableReservationsController(ITableReservationService reservations) : ControllerBase
    {
        private static readonly TimeSpan MaxAvailabilityWindow = TimeSpan.FromDays(7);

        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<TableReservationDto>>> GetAll(
            [FromQuery] ReservationStatus? status, CancellationToken cancellationToken) =>
            Ok(await reservations.GetAsync(CurrentUserId(), IsStaff(), status, cancellationToken));

        // When tables are taken in a window of at most a week. Open to every signed-in user and free of names, so students
        // can pick a free slot before they ask.
        [HttpGet("availability")]
        public async Task<ActionResult<IReadOnlyList<TableBusySlotDto>>> GetAvailability(
            [FromQuery] DateTime from, [FromQuery] DateTime to, CancellationToken cancellationToken)
        {
            if (to <= from)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "'to' must be after 'from'.");
            }

            if (to - from > MaxAvailabilityWindow)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: $"Ask for at most {MaxAvailabilityWindow.TotalDays:0} days at a time.");
            }

            return Ok(await reservations.GetBusySlotsAsync(from, to, cancellationToken));
        }

        [HttpPost]
        public Task<ActionResult<TableReservationDto>> Create(TableReservationRequest request, CancellationToken cancellationToken) =>
            RunAsync(async () => await reservations.RequestAsync(CurrentUserId(), request, cancellationToken));

        [HttpPost("{id:guid}/approve")]
        [Authorize(Roles = AppRoles.Staff)]
        public Task<ActionResult<TableReservationDto>> Approve(Guid id, CancellationToken cancellationToken) =>
            RunAsync(() => reservations.ApproveAsync(id, CurrentUserName(), cancellationToken));

        [HttpPost("{id:guid}/reject")]
        [Authorize(Roles = AppRoles.Staff)]
        public Task<ActionResult<TableReservationDto>> Reject(Guid id, RejectReservationRequest request, CancellationToken cancellationToken) =>
            RunAsync(() => reservations.RejectAsync(id, CurrentUserName(), request.Reason, cancellationToken));

        [HttpPost("{id:guid}/cancel")]
        public Task<ActionResult<TableReservationDto>> Cancel(Guid id, CancellationToken cancellationToken) =>
            RunAsync(() => reservations.CancelAsync(id, CurrentUserId(), IsStaff(), cancellationToken));

        // Maps the service's failures to HTTP: missing -> 404, broken rule -> 409, someone else's -> 403.
        private async Task<ActionResult<TableReservationDto>> RunAsync(Func<Task<TableReservationDto?>> action)
        {
            try
            {
                var reservation = await action();

                return reservation is null ? NotFound() : Ok(reservation);
            }
            catch (KeyNotFoundException ex)
            {
                return Problem(statusCode: StatusCodes.Status404NotFound, detail: ex.Message);
            }
            catch (ReservationException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        private bool IsStaff() => User.IsInRole(AppRoles.Administrator) || User.IsInRole(AppRoles.Librarian);

        private string CurrentUserName() =>
            User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? CurrentUserId();

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
