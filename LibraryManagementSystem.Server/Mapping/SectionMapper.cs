using LibraryManagementSystem.Server.Dtos.Sections;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class SectionMapper
    {
        // FloorName / ShelfName are flattened; the section must be loaded with its Floor and Shelf.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial SectionDto ToDto(Section section);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Section ToEntity(SectionRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(SectionRequest request, [MappingTarget] Section section);
    }
}
