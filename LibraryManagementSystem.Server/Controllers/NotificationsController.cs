using System.Security.Claims;
using LibraryManagementSystem.Server.Dtos.Notifications;
using LibraryManagementSystem.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Every user only ever sees and changes their own notifications.
    [ApiController]
    [Authorize]
    [Route("api/notifications")]
    public class NotificationsController(INotificationService notifications) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<IReadOnlyList<NotificationDto>>> GetAll(CancellationToken cancellationToken) =>
            Ok(await notifications.GetAsync(CurrentUserId(), cancellationToken));

        [HttpPost("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken) =>
            await notifications.MarkReadAsync(id, CurrentUserId(), cancellationToken) ? NoContent() : NotFound();

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
        {
            await notifications.MarkAllReadAsync(CurrentUserId(), cancellationToken);

            return NoContent();
        }

        private string CurrentUserId() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? throw new InvalidOperationException("The token has no user id.");
    }
}
