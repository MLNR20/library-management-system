using LibraryManagementSystem.Server.Dtos.Shelves;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class ShelfMapper
    {
        // FloorName is flattened from Floor.Name; the shelf must be loaded with its Floor.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial ShelfDto ToDto(Shelf shelf);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Shelf ToEntity(ShelfRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(ShelfRequest request, [MappingTarget] Shelf shelf);
    }
}
