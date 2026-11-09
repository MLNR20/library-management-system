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

        // Pending and approved reservations that overlap [fromUtc, toUtc), earliest first, without who made them.
        Task<IReadOnlyList<TableBusySlotDto>> GetBusySlotsAsync(DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);

        // Files a pending request. Throws KeyNotFoundException (table or user missing) and ReservationException (rule broken).
        // With an idempotencyKey a repeat of the same request by the same user returns the reservation it already filed
        // instead of a second one; the same key for a different table or time is a ReservationException.
        Task<TableReservationDto> RequestAsync(
            string requesterId, TableReservationRequest request, string? idempotencyKey = null, CancellationToken cancellationToken = default);

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

        public async Task<IReadOnlyList<TableBusySlotDto>> GetBusySlotsAsync(
            DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
        {
            return await unitOfWork.Repository<TableReservation>().Query()
                .Where(TableReservation.OccupiesWindow(AsUtc(fromUtc), AsUtc(toUtc)))
                .OrderBy(r => r.StartUtc)
                .Select(r => new TableBusySlotDto(r.TableId, r.StartUtc, r.EndUtc, r.Status))
                .ToListAsync(cancellationToken);
        }

        public async Task<TableReservationDto> RequestAsync(
            string requesterId, TableReservationRequest request, string? idempotencyKey = null, CancellationToken cancellationToken = default)
        {
            idempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey.Trim();
            var startUtc = AsUtc(request.StartUtc);
            var endUtc = AsUtc(request.EndUtc);

            if (idempotencyKey is not null)
            {
                var replay = await FindByKeyAsync(requesterId, idempotencyKey, request.TableId, startUtc, endUtc, cancellationToken);
                if (replay is not null)
                {
                    return replay;
                }
            }

            var user = await userManager.FindByIdAsync(requesterId)
                ?? throw new KeyNotFoundException($"User {requesterId} was not found.");
            var table = await unitOfWork.Repository<StudyTable>().GetByIdAsync(request.TableId, cancellationToken)
                ?? throw new KeyNotFoundException($"Table {request.TableId} was not found.");

            var roles = await userManager.GetRolesAsync(user);
            var reservation = TableReservation.Request(table, user, roles, startUtc, endUtc, request.Note, DateTime.UtcNow);
            reservation.IdempotencyKey = idempotencyKey;

            await unitOfWork.Repository<TableReservation>().AddAsync(reservation, cancellationToken);
            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (idempotencyKey is not null)
            {
                // Two copies of the same request raced and the other one saved first: answer with its reservation.
                var winner = await FindByKeyAsync(requesterId, idempotencyKey, request.TableId, startUtc, endUtc, cancellationToken);
                if (winner is null)
                {
                    throw;
                }

                return winner;
            }

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

        // The reservation this user already filed under the key, or null. Throws when the key was used for something else.
        private async Task<TableReservationDto?> FindByKeyAsync(
            string userId, string key, Guid tableId, DateTime startUtc, DateTime endUtc, CancellationToken cancellationToken)
        {
            var existing = await WithRelations(unitOfWork.Repository<TableReservation>().Query())
                .FirstOrDefaultAsync(r => r.UserId == userId && r.IdempotencyKey == key, cancellationToken);

            if (existing is null)
            {
                return null;
            }

            if (!existing.IsSameRequestAs(tableId, startUtc, endUtc))
            {
                throw new ReservationException("This Idempotency-Key was already used for a different reservation request.");
            }

            return ToDto(existing);
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
