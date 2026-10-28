using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Auth;
using LibraryManagementSystem.Server.Dtos.Roles;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Repositories;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class UserRoleService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IUnitOfWork unitOfWork,
        ApplicationDbContext context) : IUserRoleService
    {
        public async Task<IReadOnlyList<UserRolesDto>> GetUsersAsync(CancellationToken cancellationToken = default)
        {
            var users = await userManager.Users.AsNoTracking().OrderBy(u => u.UserName).ToListAsync(cancellationToken);

            // One query for every user's roles instead of one per user.
            var assignments = await (
                from userRole in context.UserRoles
                join role in context.Roles on userRole.RoleId equals role.Id
                select new { userRole.UserId, RoleName = role.Name! })
                .ToListAsync(cancellationToken);
            var rolesByUser = assignments.ToLookup(a => a.UserId, a => a.RoleName);

            return users
                .Select(user => new UserRolesDto(AuthMapper.ToDto(user), rolesByUser[user.Id].Order().ToList()))
                .ToList();
        }

        public async Task<UserRolesDto?> GetUserRolesAsync(string userId, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(userId);

            return user is null ? null : await BuildAsync(user);
        }

        public async Task<IReadOnlyList<UserDto>?> GetUsersInRoleAsync(string roleId, CancellationToken cancellationToken = default)
        {
            var role = await roleManager.FindByIdAsync(roleId);
            if (role is null)
            {
                return null;
            }

            var users = await userManager.GetUsersInRoleAsync(role.Name!);

            return users.OrderBy(u => u.Email).Select(AuthMapper.ToDto).ToList();
        }

        public async Task<UserRolesDto?> AssignAsync(string userId, AssignRoleRequest request, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return null;
            }

            var role = await FindRoleAsync(request.RoleName);
            if (!await userManager.IsInRoleAsync(user, role.Name!))
            {
                IdentityException.ThrowIfFailed(await userManager.AddToRoleAsync(user, role.Name!));
            }

            return await BuildAsync(user);
        }

        public async Task<UserRolesDto?> SetRolesAsync(string userId, SetUserRolesRequest request, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return null;
            }

            var wanted = new List<string>();
            foreach (var roleName in request.RoleNames)
            {
                wanted.Add((await FindRoleAsync(roleName)).Name!);
            }

            var current = await userManager.GetRolesAsync(user);
            var toRemove = current.Except(wanted, StringComparer.OrdinalIgnoreCase).ToList();
            var toAdd = wanted.Except(current, StringComparer.OrdinalIgnoreCase).ToList();

            if (toRemove.Contains(AppRoles.Administrator, StringComparer.OrdinalIgnoreCase))
            {
                await EnsureAnotherAdministratorExistsAsync();
            }

            // Removing and adding are separate Identity calls, so run them together or not at all.
            await unitOfWork.ExecuteInTransactionAsync(async _ =>
            {
                if (toRemove.Count > 0)
                {
                    IdentityException.ThrowIfFailed(await userManager.RemoveFromRolesAsync(user, toRemove));
                }

                if (toAdd.Count > 0)
                {
                    IdentityException.ThrowIfFailed(await userManager.AddToRolesAsync(user, toAdd));
                }
            }, cancellationToken);

            return await BuildAsync(user);
        }

        public async Task<UserRolesDto?> RemoveAsync(string userId, string roleName, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return null;
            }

            if (await userManager.IsInRoleAsync(user, roleName))
            {
                if (string.Equals(roleName, AppRoles.Administrator, StringComparison.OrdinalIgnoreCase))
                {
                    await EnsureAnotherAdministratorExistsAsync();
                }

                IdentityException.ThrowIfFailed(await userManager.RemoveFromRoleAsync(user, roleName));
            }

            return await BuildAsync(user);
        }

        // Called only when a user who currently holds the role is about to lose it.
        private async Task EnsureAnotherAdministratorExistsAsync()
        {
            if ((await userManager.GetUsersInRoleAsync(AppRoles.Administrator)).Count <= 1)
            {
                throw new InvalidOperationException(
                    $"At least one user must keep the {AppRoles.Administrator} role; assign it to someone else first.");
            }
        }

        private async Task<IdentityRole> FindRoleAsync(string roleName) =>
            await roleManager.FindByNameAsync(roleName)
            ?? throw new KeyNotFoundException($"Role '{roleName}' was not found.");

        private async Task<UserRolesDto> BuildAsync(ApplicationUser user)
        {
            var roles = await userManager.GetRolesAsync(user);

            return new UserRolesDto(AuthMapper.ToDto(user), roles.Order().ToList());
        }
    }
}
