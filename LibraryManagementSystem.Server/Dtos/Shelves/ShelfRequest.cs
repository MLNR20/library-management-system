namespace LibraryManagementSystem.Server.Dtos.Shelves
{
    public record ShelfRequest(string Name, Guid FloorId, int Rotation);
}
