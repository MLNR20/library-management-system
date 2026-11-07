using LibraryManagementSystem.Server.Dtos.Notifications;

namespace LibraryManagementSystem.Server.Services
{
    public interface INotificationService
    {
        // Writes a "due soon" or "overdue" reminder for every open loan that needs one and does not already have one
        // today, and returns how many it created. Safe to call repeatedly.
        Task<int> CreateDueRemindersAsync(DateTime nowUtc, CancellationToken cancellationToken = default);

        // The user's own notifications, newest first, at most 50.
        Task<IReadOnlyList<NotificationDto>> GetAsync(string userId, CancellationToken cancellationToken = default);

        // Returns false when the notification does not exist or belongs to someone else.
        Task<bool> MarkReadAsync(Guid id, string userId, CancellationToken cancellationToken = default);

        Task MarkAllReadAsync(string userId, CancellationToken cancellationToken = default);
    }
}
