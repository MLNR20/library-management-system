namespace LibraryManagementSystem.Server.Dtos.Sections
{
    public record SectionDto(Guid Id, string Name, Guid FloorId, string FloorName, Guid ShelfId, string ShelfName);
}
