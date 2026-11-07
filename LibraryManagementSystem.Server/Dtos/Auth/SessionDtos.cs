namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record RefreshRequest(string RefreshToken);

    // One signed-in device. IsCurrent marks the session the request itself came from.
    public record SessionDto(
        Guid Id,
        DateTime CreatedAtUtc,
        DateTime LastSeenAtUtc,
        DateTime ExpiresAtUtc,
        string? IpAddress,
        string? UserAgent,
        bool IsCurrent);
}
