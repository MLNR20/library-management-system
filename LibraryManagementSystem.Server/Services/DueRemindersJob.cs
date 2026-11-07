using LibraryManagementSystem.Server.Settings;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    // Scheduled job: once at startup and then every day at Reminders:RunAt it writes in-app reminders for students whose
    // books are due soon or overdue. Running twice in a day is harmless, the service writes one reminder per loan per day.
    public class DueRemindersJob(
        IServiceScopeFactory scopeFactory,
        IOptions<ReminderSettings> options,
        ILogger<DueRemindersJob> logger) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var settings = options.Value;
            var zone = settings.ResolveTimeZone();

            while (!stoppingToken.IsCancellationRequested)
            {
                await RunOnceAsync(stoppingToken);

                var delay = ReminderSchedule.NextRunUtc(DateTime.UtcNow, settings.RunAt, zone) - DateTime.UtcNow;
                logger.LogInformation("Next due-books reminder run in {Delay:hh\\:mm\\:ss}", delay);

                try
                {
                    await Task.Delay(delay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
            }
        }

        private async Task RunOnceAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

                var created = await notifications.CreateDueRemindersAsync(DateTime.UtcNow, cancellationToken);
                logger.LogInformation("Due-books reminders written: {Count}", created);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // A failed run (database down, ...) must not stop the schedule; the next day tries again.
                logger.LogError(ex, "Writing due-books reminders failed");
            }
        }
    }
}
