using LibraryManagementSystem.Server.Dtos.AuditLogs;
using LibraryManagementSystem.Server.Services;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryManagementSystem.Server.Controllers
{
    // Read-only and for administrators only: the log can be searched but never edited through the API.
    [ApiController]
    [Authorize(Roles = AppRoles.Administrator)]
    [Route("api/audit-logs")]
    public class AuditLogsController(IAuditService audit) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<PagedResult<AuditLogDto>>> Query([FromQuery] AuditLogQuery query, CancellationToken cancellationToken) =>
            Ok(await audit.QueryAsync(query, cancellationToken));

        [HttpGet("actions")]
        public async Task<ActionResult<IReadOnlyList<string>>> GetActions(CancellationToken cancellationToken) =>
            Ok(await audit.GetActionsAsync(cancellationToken));
    }
}
