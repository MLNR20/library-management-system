namespace LibraryManagementSystem.Server.Dtos.Announcements
{
    // FloorId null means the announcement is for the entire library. Body is HTML from the rich text editor.
    public record AnnouncementRequest(string Title, string Body, Guid? FloorId);
}
