using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.BookReservations;
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
    public class BookReservationService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        IAuditService audit,
        IOptions<BorrowingSettings> options) : IBookReservationService
    {
        private readonly BorrowingSettings settings = options.Value;

        public async Task<IReadOnlyList<BookReservationDto>> GetAsync(
            string requesterId, bool isStaff, BookReservationStatus? status, CancellationToken cancellationToken = default)
        {
            var reservations = WithRelations(unitOfWork.Repository<BookReservation>().Query());

            if (!isStaff)
            {
                reservations = reservations.Where(r => r.StudentId == requesterId);
            }

            if (status is not null)
            {
                reservations = reservations.Where(r => r.Status == status);
            }

            var page = await reservations.OrderByDescending(r => r.ReservedAtUtc).Take(500).ToListAsync(cancellationToken);

            return page.Select(r => BookReservationMapper.ToDto(r)).ToList();
        }

        public async Task<BookReservationDto> ReserveAsync(string requesterId, BookReservationRequest request, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(requesterId)
                ?? throw new KeyNotFoundException($"User {requesterId} was not found.");
            var book = await unitOfWork.Books.Query(asNoTracking: false).FirstOrDefaultAsync(b => b.Id == request.BookId, cancellationToken)
                ?? throw new KeyNotFoundException($"Book {request.BookId} was not found.");

            var roles = await userManager.GetRolesAsync(user);
            var reservation = BookReservation.Reserve(book, user, roles, DateTime.UtcNow);

            await unitOfWork.Repository<BookReservation>().AddAsync(reservation, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookReserved,
                target: $"{book.Title}: {user.UserName}",
                cancellationToken: cancellationToken);

            return BookReservationMapper.ToDto(reservation);
        }

        public async Task<BookReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default)
        {
            var reservation = await FindForUpdateAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            EnsureOwnerOrStaff(reservation, requesterId, isStaff);
            reservation.Cancel();
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookReservationCancelled,
                target: $"{reservation.Book.Title}: {reservation.Student.UserName}",
                cancellationToken: cancellationToken);

            return BookReservationMapper.ToDto(reservation);
        }

        public async Task<(BookReservationDto Reservation, BorrowingDto Borrowing)?> CollectAsync(
            Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default)
        {
            var reservation = await FindForUpdateAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            EnsureOwnerOrStaff(reservation, requesterId, isStaff);

            var now = DateTime.UtcNow;
            var roles = await userManager.GetRolesAsync(reservation.Student);
            var borrowing = reservation.Collect(roles, now, TimeSpan.FromDays(settings.LoanPeriodDays));

            await unitOfWork.Repository<Borrowing>().AddAsync(borrowing, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.BookCollected,
                target: $"{reservation.Book.Title}: {reservation.Student.UserName}",
                details: $"Due {borrowing.DueAtUtc:yyyy-MM-dd HH:mm} UTC",
                cancellationToken: cancellationToken);

            return (BookReservationMapper.ToDto(reservation), BorrowingMapper.ToDto(borrowing, now, settings.PenaltyPerDay));
        }

        private static void EnsureOwnerOrStaff(BookReservation reservation, string requesterId, bool isStaff)
        {
            if (!isStaff && reservation.StudentId != requesterId)
            {
                throw new UnauthorizedAccessException("You can only change your own reservations.");
            }
        }

        private Task<BookReservation?> FindForUpdateAsync(Guid id, CancellationToken cancellationToken) =>
            WithRelations(unitOfWork.Repository<BookReservation>().Query(asNoTracking: false)).FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        private static IQueryable<BookReservation> WithRelations(IQueryable<BookReservation> reservations) =>
            reservations.Include(r => r.Book).Include(r => r.Student).Include(r => r.Borrowing);
    }
}
