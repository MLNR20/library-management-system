using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Borrowings;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using LibraryManagementSystem.Server.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LibraryManagementSystem.Server.Services
{
    public class BorrowingService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        IAuditService audit,
        IOptions<BorrowingSettings> options) : IBorrowingService
    {
        private readonly BorrowingSettings settings = options.Value;

        public async Task<IReadOnlyList<BorrowingDto>> GetAsync(
            string requesterId, bool allUsers, string? userId, BorrowingFilter filter, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var loans = WithRelations(unitOfWork.Repository<Borrowing>().Query());

            if (!allUsers)
            {
                loans = loans.Where(b => b.UserId == requesterId);
            }
            else if (!string.IsNullOrWhiteSpace(userId))
            {
                loans = loans.Where(b => b.UserId == userId);
            }

            loans = filter switch
            {
                BorrowingFilter.Active => loans.Where(b => b.ReturnedAtUtc == null),
                BorrowingFilter.Overdue => loans.Where(BorrowingRules.Overdue(now)),
                BorrowingFilter.Returned => loans.Where(b => b.ReturnedAtUtc != null),
                _ => loans
            };

            var page = await loans.OrderByDescending(b => b.BorrowedAtUtc).Take(500).ToListAsync(cancellationToken);

            return page.Select(b => BorrowingMapper.ToDto(b, now, settings.PenaltyPerDay)).ToList();
        }

        public async Task<BorrowingDto> BorrowAsync(string requesterId, BorrowRequest request, CancellationToken cancellationToken = default)
        {
            var borrowerId = string.IsNullOrWhiteSpace(request.UserId) ? requesterId : request.UserId;
            var user = await userManager.FindByIdAsync(borrowerId)
                ?? throw new KeyNotFoundException($"User {borrowerId} was not found.");
            var book = await unitOfWork.Books.Query(asNoTracking: false).FirstOrDefaultAsync(b => b.Id == request.BookId, cancellationToken)
                ?? throw new KeyNotFoundException($"Book {request.BookId} was not found.");

            var now = DateTime.UtcNow;
            var roles = await userManager.GetRolesAsync(user);
            var borrowing = Borrowing.Start(book, user, roles, now, TimeSpan.FromDays(settings.LoanPeriodDays));

            await unitOfWork.Repository<Borrowing>().AddAsync(borrowing, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookBorrowed,
                target: $"{book.Title}: {user.UserName}",
                details: $"Due {borrowing.DueAtUtc:yyyy-MM-dd HH:mm} UTC",
                cancellationToken: cancellationToken);

            return BorrowingMapper.ToDto(borrowing, now, settings.PenaltyPerDay);
        }

        public async Task<BorrowingDto?> RequestReturnAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default)
        {
            var borrowing = await FindForUpdateAsync(id, cancellationToken);
            if (borrowing is null)
            {
                return null;
            }

            if (!isStaff && borrowing.UserId != requesterId)
            {
                throw new UnauthorizedAccessException("You can only return your own loans.");
            }

            var now = DateTime.UtcNow;
            borrowing.RequestReturn(now);
            (await ReservationOfAsync(id, cancellationToken))?.MarkReturnRequested(now);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookReturnRequested,
                target: $"{borrowing.Book.Title}: {borrowing.User.UserName}",
                cancellationToken: cancellationToken);

            return BorrowingMapper.ToDto(borrowing, now, settings.PenaltyPerDay);
        }

        public async Task<BorrowingDto?> ApproveReturnAsync(Guid id, string approverName, CancellationToken cancellationToken = default)
        {
            var borrowing = await FindForUpdateAsync(id, cancellationToken);
            if (borrowing is null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            borrowing.Return(borrowing.ReturnRequestedAtUtc ?? now, settings.PenaltyPerDay);
            (await ReservationOfAsync(id, cancellationToken))?.MarkReturned(approverName, now);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookReturned,
                target: $"{borrowing.Book.Title}: {borrowing.User.UserName}",
                details: borrowing.PenaltyAmount > 0 ? $"Penalty {borrowing.PenaltyAmount:0.00}" : null,
                cancellationToken: cancellationToken);

            return BorrowingMapper.ToDto(borrowing, now, settings.PenaltyPerDay);
        }

        public async Task<IReadOnlyList<BorrowingDto>> RefreshPenaltiesAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var overdue = await WithRelations(unitOfWork.Repository<Borrowing>().Query(asNoTracking: false))
                .Where(BorrowingRules.OpenOverdue(now))
                .ToListAsync(cancellationToken);

            var changed = new List<Borrowing>();
            foreach (var borrowing in overdue)
            {
                var penalty = borrowing.CalculatePenalty(now, settings.PenaltyPerDay);
                if (penalty != borrowing.PenaltyAmount)
                {
                    borrowing.PenaltyAmount = penalty;
                    changed.Add(borrowing);
                }
            }

            if (changed.Count > 0)
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return changed.Select(b => BorrowingMapper.ToDto(b, now, settings.PenaltyPerDay)).ToList();
        }

        private Task<Borrowing?> FindForUpdateAsync(Guid id, CancellationToken cancellationToken) =>
            WithRelations(unitOfWork.Repository<Borrowing>().Query(asNoTracking: false)).FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        // The reservation this loan came from, if it came from one.
        private Task<BookReservation?> ReservationOfAsync(Guid borrowingId, CancellationToken cancellationToken) =>
            unitOfWork.Repository<BookReservation>().Query(asNoTracking: false).FirstOrDefaultAsync(r => r.BorrowingId == borrowingId, cancellationToken);

        private static IQueryable<Borrowing> WithRelations(IQueryable<Borrowing> loans) =>
            loans.Include(b => b.Book).Include(b => b.User);
    }
}
