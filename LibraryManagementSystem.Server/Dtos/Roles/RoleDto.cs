using LibraryManagementSystem.Server.Dtos.Auth;

namespace LibraryManagementSystem.Server.Dtos.Roles
{
    public record RoleDto(string Id, string Name);

    public record UserRolesDto(UserDto User, IReadOnlyList<string> Roles);
}
