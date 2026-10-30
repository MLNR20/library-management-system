using LibraryManagementSystem.Server.Settings;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    // Background worker: every PenaltyCheckSeconds it recalculates the penalty of each overdue open loan and pushes the
    // ones that changed to their borrower and the administrators through SignalR.
    public class OverdueBorrowingMonitor(
        IServiceScopeFactory scopeFactory,
        IOptions<BorrowingSettings> options,
        ILogger<OverdueBorrowingMonitor> logger) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.Value.PenaltyCheckSeconds));

            do
            {
                try
                {
                    await RefreshAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // One bad tick (database down, ...) must not stop the monitor.
                    logger.LogError(ex, "Refreshing overdue penalties failed");
                }
            }
            while (await WaitAsync(timer, stoppingToken));
        }

        private async Task RefreshAsync(CancellationToken cancellationToken)
        {
            using var scope = scopeFactory.CreateScope();
            var borrowings = scope.ServiceProvider.GetRequiredService<IBorrowingService>();
            var notifier = scope.ServiceProvider.GetRequiredService<IBorrowingNotifier>();

            foreach (var borrowing in await borrowings.RefreshPenaltiesAsync(cancellationToken))
            {
                await notifier.PenaltyUpdatedAsync(borrowing, cancellationToken);
            }
        }

        private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken cancellationToken)
        {
            try
            {
                return await timer.WaitForNextTickAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }
    }
}
