using LibraryManagementSystem.Server.Dtos.TimeCards;

namespace LibraryManagementSystem.Server.Services
{
    public interface IClockService
    {
        Task<ClockStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default);

        // Time cards newest first, at most 500. Administrators (allUsers) see everyone's, optionally narrowed to one
        // userId; everyone else only ever gets their own and userId is ignored.
        Task<IReadOnlyList<TimeCardDto>> GetCardsAsync(
            string requesterId, bool allUsers, DateOnly? from, DateOnly? to, string? userId, CancellationToken cancellationToken = default);

        // Opens an entry on today's time card. Throws InvalidOperationException when the user is already clocked in.
        Task<ClockStateDto> ClockInAsync(string userId, CancellationToken cancellationToken = default);

        // Closes the open entry. Throws InvalidOperationException when the user is not clocked in.
        Task<ClockStateDto> ClockOutAsync(string userId, CancellationToken cancellationToken = default);
    }
}
