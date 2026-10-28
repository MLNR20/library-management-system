using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Auth;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class AuthMapper
    {
        // The password is hashed by UserManager, never copied onto the entity.
        // Every request field must be consumed; the many Identity-managed target fields are intentionally left alone.
        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        [MapperIgnoreSource(nameof(RegisterRequest.Password))]
        [MapperIgnoreSource(nameof(RegisterRequest.ConfirmPassword))]
        public static partial ApplicationUser ToUser(RegisterRequest request);

        // Every DTO field must be filled; the sensitive Identity fields on the entity are never exposed.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial UserDto ToDto(ApplicationUser user);
    }
}
