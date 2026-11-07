using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Each user sees and ends only their own sign-ins. Ending a session stops its access token within one request.
    [ApiController]
    [Authorize]
    [Route("api/sessions")]
    public class SessionsController(ISessionService sessions, IAuditService audit) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<SessionDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await sessions.GetActiveAsync(CurrentUserId(), CurrentSessionId(), cancellationToken));

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
        {
            if (!await sessions.RevokeAsync(id, CurrentUserId(), "Ended by the user", cancellationToken))
            {
                return NotFound();
            }

            await audit.WriteAsync(AuditActions.SessionRevoked, target: id.ToString(), details: id == CurrentSessionId() ? "This device" : "Another device", cancellationToken: cancellationToken);

            return NoContent();
        }

        // "Sign out everywhere else": ends every live session but the one making the request.
        [HttpPost("revoke-others")]
        public async Task<ActionResult<int>> RevokeOthers(CancellationToken cancellationToken)
        {
            var current = CurrentSessionId();
            if (current is null)
            {
                return Problem(statusCode: StatusCodes.Status409Conflict, detail: "This sign-in predates session tracking. Sign in again first.");
            }

            var ended = await sessions.RevokeOthersAsync(CurrentUserId(), current.Value, "Ended by the user", cancellationToken);
            if (ended > 0)
            {
                await audit.WriteAsync(AuditActions.SessionRevoked, details: $"{ended} other session(s)", cancellationToken: cancellationToken);
            }

            return Ok(ended);
        }

        private Guid? CurrentSessionId() =>
            Guid.TryParse(User.FindFirstValue(SessionClaim.Name), out var id) ? id : null;

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
