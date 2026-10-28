namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record UserDto(string Id, string UserName, string Email);

    public record CurrentUserResponse(UserDto User, IList<string> Roles);

    public record AuthResponse(string AccessToken, DateTime ExpiresAtUtc, UserDto User, IList<string> Roles);
}
