using LibraryManagementSystem.Server.Dtos.Roles;

namespace LibraryManagementSystem.Server.Services
{
    public interface IRoleService
    {
        Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<RoleDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

        // Throws IdentityException when the name is empty or already taken.
        Task<RoleDto> CreateAsync(RoleRequest request, CancellationToken cancellationToken = default);

        // Returns null when the role does not exist; throws IdentityException like CreateAsync.
        Task<RoleDto?> UpdateAsync(string id, RoleRequest request, CancellationToken cancellationToken = default);

        // Returns false when the role does not exist; throws InvalidOperationException while users still hold it.
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);
    }
}
