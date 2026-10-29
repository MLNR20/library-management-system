namespace LibraryManagementSystem.Server.Dtos.Announcements
{
    public record AnnouncementDto(Guid Id, string Title, string Body, Guid? FloorId, string? FloorName, DateTime CreatedAt);
}
