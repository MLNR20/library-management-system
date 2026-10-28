using LibraryManagementSystem.Server.Dtos.Roles;
using Microsoft.AspNetCore.Identity;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class RoleMapper
    {
        // Every DTO field must be filled; the normalized name and concurrency stamp are never exposed.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial RoleDto ToDto(IdentityRole role);
    }
}
