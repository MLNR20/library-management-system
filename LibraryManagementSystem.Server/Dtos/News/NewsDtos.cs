namespace LibraryManagementSystem.Server.Dtos.News
{
    // ImageUrl is where the cover image can be fetched from (null when the article has none). Body is HTML.
    public record NewsPostDto(Guid Id, string Title, string Body, string? ImageUrl, DateTime CreatedAt);

    // ImageFileName is the name returned by the image upload; null means no cover image.
    public record NewsPostRequest(string Title, string Body, string? ImageFileName);

    public record NewsImageDto(string FileName, string Url);
}
