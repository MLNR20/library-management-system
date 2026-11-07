using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public interface ITableReservationService
    {
        // Newest first, at most 200. Staff see everyone's, optionally narrowed to one status; everyone else only their own.
        Task<IReadOnlyList<TableReservationDto>> GetAsync(string requesterId, bool isStaff, ReservationStatus? status, CancellationToken cancellationToken = default);

        // Files a pending request. Throws KeyNotFoundException (table or user missing) and ReservationException (rule broken).
        Task<TableReservationDto> RequestAsync(string requesterId, TableReservationRequest request, CancellationToken cancellationToken = default);

        // The next three return null when the reservation does not exist and throw ReservationException when the rules forbid it.
        Task<TableReservationDto?> ApproveAsync(Guid id, string deciderName, CancellationToken cancellationToken = default);

        Task<TableReservationDto?> RejectAsync(Guid id, string deciderName, string? reason, CancellationToken cancellationToken = default);

        // Throws UnauthorizedAccessException when a non-staff user cancels someone else's reservation.
        Task<TableReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default);
    }

    public class TableReservationService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        IAuditService audit) : ITableReservationService
    {
        public async Task<IReadOnlyList<TableReservationDto>> GetAsync(
            string requesterId, bool isStaff, ReservationStatus? status, CancellationToken cancellationToken = default)
        {
            var reservations = WithRelations(unitOfWork.Repository<TableReservation>().Query());

            if (!isStaff)
            {
                reservations = reservations.Where(r => r.UserId == requesterId);
            }

            if (status is not null)
            {
                reservations = reservations.Where(r => r.Status == status);
            }

            var page = await reservations.OrderByDescending(r => r.StartUtc).Take(200).ToListAsync(cancellationToken);

            return page.Select(ToDto).ToList();
        }

        public async Task<TableReservationDto> RequestAsync(string requesterId, TableReservationRequest request, CancellationToken cancellationToken = default)
        {
            var user = await userManager.FindByIdAsync(requesterId)
                ?? throw new KeyNotFoundException($"User {requesterId} was not found.");
            var table = await unitOfWork.Repository<StudyTable>().GetByIdAsync(request.TableId, cancellationToken)
                ?? throw new KeyNotFoundException($"Table {request.TableId} was not found.");

            var roles = await userManager.GetRolesAsync(user);
            var reservation = TableReservation.Request(
                table, user, roles, AsUtc(request.StartUtc), AsUtc(request.EndUtc), request.Note, DateTime.UtcNow);

            await unitOfWork.Repository<TableReservation>().AddAsync(reservation, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.TableRequested,
                target: $"{table.Name}: {user.UserName}",
                details: $"{reservation.StartUtc:yyyy-MM-dd HH:mm} to {reservation.EndUtc:HH:mm} UTC",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<TableReservationDto?> ApproveAsync(Guid id, string deciderName, CancellationToken cancellationToken = default)
        {
            var reservation = await FindTrackedAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            var approved = await unitOfWork.Repository<TableReservation>().Query()
                .Where(r => r.TableId == reservation.TableId && r.Status == ReservationStatus.Approved && r.EndUtc > now)
                .ToListAsync(cancellationToken);

            reservation.Approve(deciderName, now, approved);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.TableApproved,
                target: $"{reservation.Table.Name}: {reservation.User.UserName}",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<TableReservationDto?> RejectAsync(Guid id, string deciderName, string? reason, CancellationToken cancellationToken = default)
        {
            var reservation = await FindTrackedAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            reservation.Reject(deciderName, DateTime.UtcNow, reason);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.TableRejected,
                target: $"{reservation.Table.Name}: {reservation.User.UserName}",
                details: reservation.DecisionNote,
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<TableReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default)
        {
            var reservation = await FindTrackedAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            if (!isStaff && reservation.UserId != requesterId)
            {
                throw new UnauthorizedAccessException("You can only cancel your own reservations.");
            }

            reservation.Cancel(DateTime.UtcNow);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.TableCancelled,
                target: $"{reservation.Table.Name}: {reservation.User.UserName}",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        private Task<TableReservation?> FindTrackedAsync(Guid id, CancellationToken cancellationToken) =>
            WithRelations(unitOfWork.Repository<TableReservation>().Query(asNoTracking: false))
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        private static IQueryable<TableReservation> WithRelations(IQueryable<TableReservation> reservations) =>
            reservations.Include(r => r.Table).ThenInclude(t => t.Section).Include(r => r.User);

        // JSON dates without an offset arrive as Unspecified; the API contract is that they are UTC.
        private static DateTime AsUtc(DateTime value) =>
            value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);

        private static TableReservationDto ToDto(TableReservation r) => new(
            r.Id, r.TableId, r.Table.Name, r.Table.Section?.Name, r.UserId, r.User.UserName ?? r.UserId, r.StartUtc, r.EndUtc, r.Note,
            r.Status, r.RequestedAtUtc, r.DecidedAtUtc, r.DecidedByName, r.DecisionNote);
    }
}
