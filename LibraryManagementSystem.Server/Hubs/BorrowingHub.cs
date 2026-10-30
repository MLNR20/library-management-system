using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LibraryManagementSystem.Server.Hubs
{
    // Server-to-client only. Every connection receives its own user's loan events; administrators also receive everyone's.
    // Client methods: "BorrowingChanged" (a loan was opened or returned) and "PenaltyUpdated" (an overdue penalty grew),
    // both carrying a BorrowingDto.
    [Authorize]
    public class BorrowingHub : Hub
    {
        public const string Path = "/api/hubs/borrowings";
        public const string BorrowingChanged = "BorrowingChanged";
        public const string PenaltyUpdated = "PenaltyUpdated";
        public const string AdministratorsGroup = "administrators";

        public override async Task OnConnectedAsync()
        {
            if (Context.User?.IsInRole(AppRoles.Administrator) == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, AdministratorsGroup);
            }

            await base.OnConnectedAsync();
        }
    }
}
