using LibraryManagementSystem.Server.Dtos.TimeCards;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class ClockService(IUnitOfWork unitOfWork, IAuditService audit) : IClockService
    {
        public async Task<ClockStateDto> GetStateAsync(string userId, CancellationToken cancellationToken = default)
        {
            var card = await FindCardAsync(userId, Today(), cancellationToken);
            var open = await FindOpenEntryAsync(userId, cancellationToken);

            return ToState(card, open);
        }

        public async Task<IReadOnlyList<TimeCardDto>> GetCardsAsync(
            string requesterId, bool allUsers, DateOnly? from, DateOnly? to, string? userId, CancellationToken cancellationToken = default)
        {
            var cards = unitOfWork.Repository<TimeCard>().Query().Include(c => c.User).Include(c => c.Entries).AsQueryable();

            if (!allUsers)
            {
                cards = cards.Where(c => c.UserId == requesterId);
            }
            else if (!string.IsNullOrWhiteSpace(userId))
            {
                cards = cards.Where(c => c.UserId == userId);
            }

            if (from is { } start)
            {
                cards = cards.Where(c => c.Date >= start);
            }

            if (to is { } end)
            {
                cards = cards.Where(c => c.Date <= end);
            }

            var page = await cards
                .OrderByDescending(c => c.Date)
                .ThenBy(c => c.User.UserName)
                .Take(500)
                .ToListAsync(cancellationToken);

            return page.Select(c => new TimeCardDto(
                c.Id,
                c.UserId,
                c.User.UserName ?? c.UserId,
                c.Date,
                c.TotalHours,
                c.TotalMinutes,
                c.Entries.Any(e => e.ClockOutUtc is null),
                c.Entries
                    .OrderBy(e => e.ClockInUtc)
                    .Select(e => new ClockEntryDto(e.Id, e.ClockInUtc, e.ClockOutUtc))
                    .ToList())).ToList();
        }

        public async Task<ClockStateDto> ClockInAsync(string userId, CancellationToken cancellationToken = default)
        {
            if (await FindOpenEntryAsync(userId, cancellationToken) is not null)
            {
                throw new InvalidOperationException("You are already clocked in.");
            }

            var today = Today();
            var card = await FindCardAsync(userId, today, cancellationToken);
            if (card is null)
            {
                card = new TimeCard { UserId = userId, Date = today };
                await unitOfWork.Repository<TimeCard>().AddAsync(card, cancellationToken);
            }

            var entry = new ClockEntry { TimeCard = card, ClockInUtc = DateTime.UtcNow, Status = ClockStatus.Working };
            card.Entries.Add(entry);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(AuditActions.ClockIn, target: $"TimeCard: {card.Date:yyyy-MM-dd}", cancellationToken: cancellationToken);

            return ToState(card, entry);
        }

        public async Task<ClockStateDto> ClockOutAsync(string userId, CancellationToken cancellationToken = default)
        {
            var open = await FindOpenEntryAsync(userId, cancellationToken)
                ?? throw new InvalidOperationException("You are not clocked in.");

            open.ClockOutUtc = DateTime.UtcNow;
            // The card the entry belongs to may be from yesterday if the shift ran past midnight.
            var card = await unitOfWork.Repository<TimeCard>().Query(asNoTracking: false)
                .Include(c => c.Entries)
                .FirstAsync(c => c.Id == open.TimeCardId, cancellationToken);
            card.RecalculateTotals();
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.ClockOut,
                target: $"TimeCard: {card.Date:yyyy-MM-dd}",
                details: $"Shift of {open.Duration:hh\\:mm\\:ss}",
                cancellationToken: cancellationToken);

            var today = await FindCardAsync(userId, Today(), cancellationToken);

            return ToState(today, null);
        }

        private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

        private async Task<TimeCard?> FindCardAsync(string userId, DateOnly date, CancellationToken cancellationToken) =>
            await unitOfWork.Repository<TimeCard>().Query(asNoTracking: false)
                .Include(c => c.Entries)
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Date == date, cancellationToken);

        private async Task<ClockEntry?> FindOpenEntryAsync(string userId, CancellationToken cancellationToken) =>
            await unitOfWork.Repository<ClockEntry>().Query(asNoTracking: false)
                .FirstOrDefaultAsync(e => e.TimeCard.UserId == userId && e.ClockOutUtc == null, cancellationToken);

        private static ClockStateDto ToState(TimeCard? card, ClockEntry? open) => new(
            open is not null,
            open?.ClockInUtc,
            card?.TotalHours ?? 0,
            card?.TotalMinutes ?? 0,
            (card?.Entries ?? [])
                .OrderBy(e => e.ClockInUtc)
                .Select(e => new ClockEntryDto(e.Id, e.ClockInUtc, e.ClockOutUtc))
                .ToList());
    }
}
