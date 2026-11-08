using LibraryManagementSystem.Server.Dtos.News;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Services;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    public static partial class NewsMapper
    {
        // Not generated: the cover image becomes a URL instead of a stored file name. (No string-to-string helper may live
        // in this class: Mapperly would apply it to every string property it maps, such as the request's ImageFileName.)
        public static NewsPostDto ToDto(NewsPost post) =>
            new(post.Id, post.Title, post.Body, post.ImageFileName is null ? null : NewsImageStore.UrlFor(post.ImageFileName), post.CreatedAt);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial NewsPost ToEntity(NewsPostRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(NewsPostRequest request, [MappingTarget] NewsPost post);

        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial FaqDto ToDto(Faq faq);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial Faq ToEntity(FaqRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        public static partial void Apply(FaqRequest request, [MappingTarget] Faq faq);
    }
}
