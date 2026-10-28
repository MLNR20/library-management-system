using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class LanguageMapper
    {
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial LanguageDto ToDto(Language language);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Language ToEntity(LanguageRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(LanguageRequest request, [MappingTarget] Language language);
    }
}
