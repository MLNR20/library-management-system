using LibraryManagementSystem.Server.Dtos.Floors;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class FloorMapper
    {
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial FloorDto ToDto(Floor floor);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Floor ToEntity(FloorRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(FloorRequest request, [MappingTarget] Floor floor);
    }
}
