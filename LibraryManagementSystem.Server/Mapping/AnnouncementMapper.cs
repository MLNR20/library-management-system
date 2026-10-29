using LibraryManagementSystem.Server.Dtos.Announcements;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class AnnouncementMapper
    {
        // FloorName is flattened from Floor.Name (null for the whole library); load the announcement with its Floor.
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial AnnouncementDto ToDto(Announcement announcement);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Announcement ToEntity(AnnouncementRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(AnnouncementRequest request, [MappingTarget] Announcement announcement);
    }
}
