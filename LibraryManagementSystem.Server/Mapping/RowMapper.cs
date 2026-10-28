using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class RowMapper
    {
        // The row must be loaded with its Shelf and the shelf's Floor.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        [MapProperty(nameof(Row.Shelf) + "." + nameof(Shelf.FloorId), nameof(RowDto.FloorId))]
        [MapProperty(nameof(Row.Shelf) + "." + nameof(Shelf.Floor) + "." + nameof(Floor.Name), nameof(RowDto.FloorName))]
        public static partial RowDto ToDto(Row row);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Row ToEntity(RowRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(RowRequest request, [MappingTarget] Row row);
    }
}
