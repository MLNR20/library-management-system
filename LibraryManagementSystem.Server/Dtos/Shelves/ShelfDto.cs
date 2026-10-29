namespace LibraryManagementSystem.Server.Dtos.Shelves
{
    public record ShelfDto(Guid Id, string Name, Guid FloorId, string FloorName, int Rotation);
}
