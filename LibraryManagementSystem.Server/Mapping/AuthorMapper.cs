using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class AuthorMapper
    {
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial AuthorDto ToDto(Author author);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Author ToEntity(AuthorRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(AuthorRequest request, [MappingTarget] Author author);
    }
}
