using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Sections
{
    public record SectionRequest(string Name, Guid FloorId, Guid ShelfId, SectionModel Model);
}
