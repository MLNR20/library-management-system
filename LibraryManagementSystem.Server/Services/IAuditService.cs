using LibraryManagementSystem.Server.Dtos.AuditLogs;

namespace LibraryManagementSystem.Server.Services
{
    public interface IAuditService
    {
        // Records one event. The acting user, IP address and user agent come from the current request;
        // pass userId/userName when the actor is not signed in yet (a login attempt).
        // A failure to write is logged and swallowed so auditing can never break the action it describes.
        Task WriteAsync(
            string action,
            bool success = true,
            string? target = null,
            string? details = null,
            string? userId = null,
            string? userName = null,
            CancellationToken cancellationToken = default);

        // Newest first.
        Task<PagedResult<AuditLogDto>> QueryAsync(AuditLogQuery query, CancellationToken cancellationToken = default);

        // Every action that appears in the log, for the filter dropdown.
        Task<IReadOnlyList<string>> GetActionsAsync(CancellationToken cancellationToken = default);
    }
}
