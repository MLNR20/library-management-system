using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Notifications
{
    public record NotificationDto(
        Guid Id,
        Guid BorrowingId,
        NotificationKind Kind,
        string Message,
        DateTime CreatedAtUtc,
        bool IsRead);
}
