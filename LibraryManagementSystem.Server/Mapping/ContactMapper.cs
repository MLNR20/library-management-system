using LibraryManagementSystem.Server.Dtos.Contacts;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class ContactMapper
    {
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial ContactDto ToDto(Contact contact);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Contact ToEntity(ContactRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(ContactRequest request, [MappingTarget] Contact contact);
    }
}
