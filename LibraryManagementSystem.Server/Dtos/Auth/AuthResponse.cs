namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record UserDto(string Id, string UserName, string Email);

    public record CurrentUserResponse(UserDto User, IList<string> Roles);

    // RefreshToken is shown once, here; the client keeps it and trades it in at POST /api/auth/refresh.
    public record AuthResponse(string AccessToken, DateTime ExpiresAtUtc, string RefreshToken, UserDto User, IList<string> Roles);
}
