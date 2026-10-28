using LibraryManagementSystem.Server.Dtos.AuditLogs;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class AuditLogMapper
    {
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial AuditLogDto ToDto(AuditLog log);
    }
}
