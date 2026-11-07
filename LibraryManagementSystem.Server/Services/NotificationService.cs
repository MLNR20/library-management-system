using LibraryManagementSystem.Server.Dtos.Notifications;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using LibraryManagementSystem.Server.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    public class NotificationService(IUnitOfWork unitOfWork, IOptions<ReminderSettings> options) : INotificationService
    {
        private readonly ReminderSettings settings = options.Value;

        public async Task<int> CreateDueRemindersAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var horizon = nowUtc.AddDays(settings.DueSoonDays);
            var loans = await unitOfWork.Repository<Borrowing>().Query()
                .Include(b => b.Book)
                .Where(b => b.ReturnedAtUtc == null && b.DueAtUtc <= horizon)
                .ToListAsync(cancellationToken);

            var day = DateOnly.FromDateTime(nowUtc);
            var loanIds = loans.Select(b => b.Id).ToList();
            var alreadySent = (await unitOfWork.Repository<Notification>().Query()
                    .Where(n => n.Day == day && loanIds.Contains(n.BorrowingId))
                    .Select(n => new { n.BorrowingId, n.Kind })
                    .ToListAsync(cancellationToken))
                .Select(n => (n.BorrowingId, n.Kind))
                .ToHashSet();

            var reminders = loans
                .Select(loan => Notification.ForLoan(loan, nowUtc, settings.DueSoonDays))
                .OfType<Notification>()
                .Where(n => !alreadySent.Contains((n.BorrowingId, n.Kind)))
                .ToList();

            if (reminders.Count > 0)
            {
                await unitOfWork.Repository<Notification>().AddRangeAsync(reminders, cancellationToken);
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return reminders.Count;
        }

        public async Task<IReadOnlyList<NotificationDto>> GetAsync(string userId, CancellationToken cancellationToken = default)
        {
            var notifications = await unitOfWork.Repository<Notification>().Query()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAtUtc)
                .Take(50)
                .ToListAsync(cancellationToken);

            return notifications
                .Select(n => new NotificationDto(n.Id, n.BorrowingId, n.Kind, n.Message, n.CreatedAtUtc, n.ReadAtUtc is not null))
                .ToList();
        }

        public async Task<bool> MarkReadAsync(Guid id, string userId, CancellationToken cancellationToken = default)
        {
            var notification = await unitOfWork.Repository<Notification>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);
            if (notification is null)
            {
                return false;
            }

            notification.MarkRead(DateTime.UtcNow);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        public async Task MarkAllReadAsync(string userId, CancellationToken cancellationToken = default)
        {
            var unread = await unitOfWork.Repository<Notification>().Query(asNoTracking: false)
                .Where(n => n.UserId == userId && n.ReadAtUtc == null)
                .ToListAsync(cancellationToken);

            var now = DateTime.UtcNow;
            foreach (var notification in unread)
            {
                notification.MarkRead(now);
            }

            if (unread.Count > 0)
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
