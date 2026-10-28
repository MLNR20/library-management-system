using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Dtos.Roles;

namespace LibraryManagementSystem.Server.Services
{
    public interface IUserRoleService
    {
        // Returns null when the user does not exist.
        Task<UserRolesDto?> GetUserRolesAsync(string userId, CancellationToken cancellationToken = default);

        // Returns null when the role does not exist.
        Task<IReadOnlyList<UserDto>?> GetUsersInRoleAsync(string roleId, CancellationToken cancellationToken = default);

        // Returns null when the user does not exist; throws KeyNotFoundException when the role does not.
        // Assigning a role the user already holds is a no-op.
        Task<UserRolesDto?> AssignAsync(string userId, AssignRoleRequest request, CancellationToken cancellationToken = default);

        // Replaces all of the user's roles in one transaction. Returns null when the user does not exist;
        // throws KeyNotFoundException when any named role does not.
        Task<UserRolesDto?> SetRolesAsync(string userId, SetUserRolesRequest request, CancellationToken cancellationToken = default);

        // Returns null when the user does not exist. Removing a role the user does not hold is a no-op.
        Task<UserRolesDto?> RemoveAsync(string userId, string roleName, CancellationToken cancellationToken = default);
    }
}
