using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.TimeCards;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Librarians (and administrators) clock themselves in and out; there is no way to act on someone else's time card.
    // Students and visitors get 403. Roles are read from the JWT, so a newly granted role applies after the next sign-in.
    [ApiController]
    [Authorize(Roles = AppRoles.Staff)]
    [Route("api/clock")]
    public class ClockController(IClockService clock) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<ClockStateDto>> GetState(CancellationToken cancellationToken) =>
            Ok(await clock.GetStateAsync(CurrentUserId(), cancellationToken));

        // Administrators get everyone's time cards (userId narrows to one person); everyone else gets their own.
        [HttpGet("cards")]
        public async Task<ActionResult<IReadOnlyList<TimeCardDto>>> GetCards(
            [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? userId, CancellationToken cancellationToken) =>
            Ok(await clock.GetCardsAsync(CurrentUserId(), User.IsInRole(AppRoles.Administrator), from, to, userId, cancellationToken));

        [HttpPost("in")]
        public async Task<ActionResult<ClockStateDto>> ClockIn(CancellationToken cancellationToken)
        {
            try
            {
                return Ok(await clock.ClockInAsync(CurrentUserId(), cancellationToken));
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        [HttpPost("out")]
        public async Task<ActionResult<ClockStateDto>> ClockOut(CancellationToken cancellationToken)
        {
            try
            {
                return Ok(await clock.ClockOutAsync(CurrentUserId(), cancellationToken));
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: ex.Message);
            }
        }

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
