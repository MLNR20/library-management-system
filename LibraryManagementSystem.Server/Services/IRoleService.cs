using LibraryManagementSystem.Server.Dtos.Roles;

namespace LibraryManagementSystem.Server.Services
{
    public interface IRoleService
    {
        Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<RoleDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

        // Throws IdentityException when the name is empty or already taken.
        Task<RoleDto> CreateAsync(RoleRequest request, CancellationToken cancellationToken = default);

        // Returns null when the role does not exist; throws IdentityException like CreateAsync, and
        // InvalidOperationException for the built-in Administrator role.
        Task<RoleDto?> UpdateAsync(string id, RoleRequest request, CancellationToken cancellationToken = default);

        // Returns false when the role does not exist; throws InvalidOperationException for the built-in
        // Administrator role and while users still hold the role.
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);
    }
}
