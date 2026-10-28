namespace LibraryManagementSystem.Server.Dtos.Rows
{
    public record RowDto(Guid Id, string Name, Guid ShelfId, string ShelfName, Guid FloorId, string FloorName);
}
