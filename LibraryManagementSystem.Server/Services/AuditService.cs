using System.Security.Claims;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.AuditLogs;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class AuditService(
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AuditService> logger) : IAuditService
    {
        public async Task WriteAsync(
            string action,
            bool success = true,
            string? target = null,
            string? details = null,
            string? userId = null,
            string? userName = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var entry = AuditEntry.Create(httpContextAccessor.HttpContext, action, success, target, details);
                // An explicit actor (a login attempt, the seeder) wins over the request principal.
                if (userId is not null || userName is not null)
                {
                    entry.UserId = userId;
                    entry.UserName = AuditEntry.Truncate(userName, 256);
                }

                context.AuditLogs.Add(entry);
                await context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Could not write audit entry {Action}", action);
            }
        }

        public async Task<PagedResult<AuditLogDto>> QueryAsync(AuditLogQuery query, CancellationToken cancellationToken = default)
        {
            var logs = context.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var search = query.Search.Trim();
                logs = logs.Where(l =>
                    (l.UserName != null && l.UserName.Contains(search))
                    || l.Action.Contains(search)
                    || (l.Target != null && l.Target.Contains(search))
                    || (l.Details != null && l.Details.Contains(search))
                    || (l.IpAddress != null && l.IpAddress.Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(query.Action))
            {
                logs = logs.Where(l => l.Action == query.Action);
            }

            if (query.Success is { } success)
            {
                logs = logs.Where(l => l.Success == success);
            }

            if (query.From is { } from)
            {
                var fromUtc = from.UtcDateTime;
                logs = logs.Where(l => l.TimestampUtc >= fromUtc);
            }

            if (query.To is { } to)
            {
                var toUtc = to.UtcDateTime;
                logs = logs.Where(l => l.TimestampUtc <= toUtc);
            }

            var total = await logs.CountAsync(cancellationToken);
            var page = await logs
                .OrderByDescending(l => l.TimestampUtc)
                .ThenByDescending(l => l.Id)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<AuditLogDto>(page.Select(AuditLogMapper.ToDto).ToList(), total, query.Page, query.PageSize);
        }

        public async Task<IReadOnlyList<string>> GetActionsAsync(CancellationToken cancellationToken = default) =>
            await context.AuditLogs.AsNoTracking().Select(l => l.Action).Distinct().OrderBy(a => a).ToListAsync(cancellationToken);
    }

    // Builds AuditLog rows; shared by AuditService and the SaveChanges interceptor so both record the same request context.
    public static class AuditEntry
    {
        public static AuditLog Create(HttpContext? http, string action, bool success, string? target, string? details)
        {
            var principal = http?.User;
            var userAgent = http?.Request.Headers.UserAgent.ToString();

            return new AuditLog
            {
                TimestampUtc = DateTime.UtcNow,
                Action = action,
                Success = success,
                UserId = Truncate(principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal?.FindFirstValue("sub"), 450),
                UserName = Truncate(principal?.FindFirstValue(ClaimTypes.Name) ?? principal?.FindFirstValue("unique_name"), 256),
                IpAddress = Truncate(http?.Connection.RemoteIpAddress?.ToString(), 45),
                UserAgent = Truncate(string.IsNullOrEmpty(userAgent) ? null : userAgent, 300),
                Target = Truncate(target, 300),
                Details = Truncate(details, 1000)
            };
        }

        public static string? Truncate(string? value, int maxLength) =>
            value is null || value.Length <= maxLength ? value : value[..(maxLength - 1)] + "…";
    }
}
