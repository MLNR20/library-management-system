namespace LibraryManagementSystem.Server.Dtos.News
{
    // Answer is HTML from the rich text editor.
    public record FaqDto(Guid Id, string Question, string Answer, int Position, DateTime CreatedAt);

    public record FaqRequest(string Question, string Answer, int Position);
}
