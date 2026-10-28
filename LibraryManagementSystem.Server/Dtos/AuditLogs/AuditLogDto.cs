namespace LibraryManagementSystem.Server.Dtos.AuditLogs
{
    public record AuditLogDto(
        Guid Id,
        DateTime TimestampUtc,
        string Action,
        bool Success,
        string? UserId,
        string? UserName,
        string? IpAddress,
        string? UserAgent,
        string? Target,
        string? Details);

    public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

    // Bound from the query string; every filter is optional.
    public class AuditLogQuery
    {
        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 20;

        // Matches user name, action, target, details and IP address.
        public string? Search { get; set; }

        // Exact action, e.g. "Auth.Login".
        public string? Action { get; set; }

        public bool? Success { get; set; }

        public DateTimeOffset? From { get; set; }

        public DateTimeOffset? To { get; set; }
    }
}
