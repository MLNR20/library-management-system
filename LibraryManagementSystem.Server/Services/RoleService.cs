using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Roles;
using LibraryManagementSystem.Server.Mapping;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    // Roles live in the Identity store, so this goes through RoleManager rather than the unit of work.
    public class RoleService(RoleManager<IdentityRole> roleManager, UserManager<ApplicationUser> userManager) : IRoleService
    {
        public async Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var roles = await roleManager.Roles.AsNoTracking().OrderBy(r => r.Name).ToListAsync(cancellationToken);

            return roles.Select(RoleMapper.ToDto).ToList();
        }

        public async Task<RoleDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
        {
            var role = await roleManager.FindByIdAsync(id);

            return role is null ? null : RoleMapper.ToDto(role);
        }

        public async Task<RoleDto> CreateAsync(RoleRequest request, CancellationToken cancellationToken = default)
        {
            var role = new IdentityRole(request.Name.Trim());

            IdentityException.ThrowIfFailed(await roleManager.CreateAsync(role));

            return RoleMapper.ToDto(role);
        }

        public async Task<RoleDto?> UpdateAsync(string id, RoleRequest request, CancellationToken cancellationToken = default)
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role is null)
            {
                return null;
            }

            role.Name = request.Name.Trim();
            IdentityException.ThrowIfFailed(await roleManager.UpdateAsync(role));

            return RoleMapper.ToDto(role);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
        {
            var role = await roleManager.FindByIdAsync(id);
            if (role is null)
            {
                return false;
            }

            // Deleting would silently strip the role from every user, so make that an explicit step.
            if ((await userManager.GetUsersInRoleAsync(role.Name!)).Count > 0)
            {
                throw new InvalidOperationException("Role cannot be deleted while users still hold it.");
            }

            IdentityException.ThrowIfFailed(await roleManager.DeleteAsync(role));

            return true;
        }
    }
}
