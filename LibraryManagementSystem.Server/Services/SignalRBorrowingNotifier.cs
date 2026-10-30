using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace LibraryManagementSystem.Server.Services
{
    public class SignalRBorrowingNotifier(IHubContext<BorrowingHub> hub) : IBorrowingNotifier
    {
        public Task BorrowingChangedAsync(BorrowingDto borrowing, CancellationToken cancellationToken = default) =>
            SendAsync(BorrowingHub.BorrowingChanged, borrowing, cancellationToken);

        public Task PenaltyUpdatedAsync(BorrowingDto borrowing, CancellationToken cancellationToken = default) =>
            SendAsync(BorrowingHub.PenaltyUpdated, borrowing, cancellationToken);

        private async Task SendAsync(string method, BorrowingDto borrowing, CancellationToken cancellationToken)
        {
            // The user id is the JWT "sub" claim (SignalR's default user identifier).
            await hub.Clients.User(borrowing.UserId).SendAsync(method, borrowing, cancellationToken);
            await hub.Clients.Group(BorrowingHub.AdministratorsGroup).SendAsync(method, borrowing, cancellationToken);
        }
    }
}
