using LibraryManagementSystem.Server.Dtos.Books;
using LibraryManagementSystem.Server.Models;
using Riok.Mapperly.Abstractions;

namespace LibraryManagementSystem.Server.Mapping
{
    [Mapper]
    [UseStaticMapper(typeof(AuthorMapper))]
    [UseStaticMapper(typeof(LanguageMapper))]
    [UseStaticMapper(typeof(RowMapper))]
    public static partial class BookMapper
    {
        // GenreName is flattened from Genre.Name; the book must be loaded with its Genre, Authors, Languages
        // and Rows (each row with its Shelf and Floor).
        [MapperRequiredMapping(RequiredMappingStrategy.Target)]
        public static partial BookDto ToDto(Book book);

        // Genre, Authors, Languages and Rows are resolved from their ids by BookService, not mapped here.
        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        [MapperIgnoreSource(nameof(BookRequest.AuthorIds))]
        [MapperIgnoreSource(nameof(BookRequest.LanguageIds))]
        [MapperIgnoreSource(nameof(BookRequest.RowIds))]
        public static partial Book ToEntity(BookRequest request);

        [MapperRequiredMapping(RequiredMappingStrategy.Source)]
        [MapperIgnoreSource(nameof(BookRequest.AuthorIds))]
        [MapperIgnoreSource(nameof(BookRequest.LanguageIds))]
        [MapperIgnoreSource(nameof(BookRequest.RowIds))]
        public static partial void Apply(BookRequest request, [MappingTarget] Book book);
    }
}
