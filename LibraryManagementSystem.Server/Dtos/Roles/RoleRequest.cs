namespace LibraryManagementSystem.Server.Dtos.Roles
{
    public record RoleRequest(string Name);

    // Assigns one role to a user; the user comes from the route.
    public record AssignRoleRequest(string RoleName);

    // Replaces every role the user has with exactly these roles.
    public record SetUserRolesRequest(IReadOnlyList<string> RoleNames);
}
