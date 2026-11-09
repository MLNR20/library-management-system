using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Dtos.Reservations;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public interface IRoomReservationService
    {
        // Newest first, at most 200. Staff see everyone's, optionally narrowed to one status; everyone else only their own.
        Task<IReadOnlyList<RoomReservationDto>> GetAsync(string requesterId, bool isStaff, ReservationStatus? status, CancellationToken cancellationToken = default);

        // Pending and approved reservations that overlap [fromUtc, toUtc), earliest first, without who made them. A table
        // reserved in the room counts too, because the whole room cannot be had while one of its tables is taken.
        Task<IReadOnlyList<RoomBusySlotDto>> GetBusySlotsAsync(DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default);

        // Files a pending request. Throws KeyNotFoundException (room or user missing) and ReservationException (rule broken).
        // With an idempotencyKey a repeat of the same request by the same user returns the reservation it already filed
        // instead of a second one; the same key for a different room or time is a ReservationException.
        Task<RoomReservationDto> RequestAsync(
            string requesterId, RoomReservationRequest request, string? idempotencyKey = null, CancellationToken cancellationToken = default);

        // The next three return null when the reservation does not exist and throw ReservationException when the rules forbid it.
        Task<RoomReservationDto?> ApproveAsync(Guid id, string deciderName, CancellationToken cancellationToken = default);

        Task<RoomReservationDto?> RejectAsync(Guid id, string deciderName, string? reason, CancellationToken cancellationToken = default);

        // Throws UnauthorizedAccessException when a non-staff user cancels someone else's reservation.
        Task<RoomReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default);
    }

    public class RoomReservationService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        IAuditService audit) : IRoomReservationService
    {
        public async Task<IReadOnlyList<RoomReservationDto>> GetAsync(
            string requesterId, bool isStaff, ReservationStatus? status, CancellationToken cancellationToken = default)
        {
            var reservations = WithRelations(unitOfWork.Repository<RoomReservation>().Query());

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

        public async Task<IReadOnlyList<RoomBusySlotDto>> GetBusySlotsAsync(
            DateTime fromUtc, DateTime toUtc, CancellationToken cancellationToken = default)
        {
            var windowStart = AsUtc(fromUtc);
            var windowEnd = AsUtc(toUtc);

            var own = await unitOfWork.Repository<RoomReservation>().Query()
                .Where(RoomReservation.OccupiesWindow(windowStart, windowEnd))
                .Select(r => new RoomBusySlotDto(r.SectionId, r.StartUtc, r.EndUtc, r.Status))
                .ToListAsync(cancellationToken);

            var viaTables = await (
                from reservation in unitOfWork.Repository<TableReservation>().Query().Where(TableReservation.OccupiesWindow(windowStart, windowEnd))
                join table in unitOfWork.Repository<StudyTable>().Query() on reservation.TableId equals table.Id
                where table.SectionId != null
                select new RoomBusySlotDto(table.SectionId!.Value, reservation.StartUtc, reservation.EndUtc, reservation.Status))
                .ToListAsync(cancellationToken);

            return own.Concat(viaTables).OrderBy(slot => slot.StartUtc).Select(WithUtcKinds).ToList();
        }

        public async Task<RoomReservationDto> RequestAsync(
            string requesterId, RoomReservationRequest request, string? idempotencyKey = null, CancellationToken cancellationToken = default)
        {
            idempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey.Trim();
            var startUtc = AsUtc(request.StartUtc);
            var endUtc = AsUtc(request.EndUtc);

            if (idempotencyKey is not null)
            {
                var replay = await FindByKeyAsync(requesterId, idempotencyKey, request.SectionId, startUtc, endUtc, cancellationToken);
                if (replay is not null)
                {
                    return replay;
                }
            }

            var user = await userManager.FindByIdAsync(requesterId)
                ?? throw new KeyNotFoundException($"User {requesterId} was not found.");
            var section = await unitOfWork.Sections.GetByIdAsync(request.SectionId, cancellationToken)
                ?? throw new KeyNotFoundException($"Reading room {request.SectionId} was not found.");

            var roles = await userManager.GetRolesAsync(user);
            var reservation = RoomReservation.Request(section, user, roles, startUtc, endUtc, request.Note, DateTime.UtcNow);
            reservation.IdempotencyKey = idempotencyKey;

            await unitOfWork.Repository<RoomReservation>().AddAsync(reservation, cancellationToken);
            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (idempotencyKey is not null)
            {
                // Two copies of the same request raced and the other one saved first: answer with its reservation.
                var winner = await FindByKeyAsync(requesterId, idempotencyKey, request.SectionId, startUtc, endUtc, cancellationToken);
                if (winner is null)
                {
                    throw;
                }

                return winner;
            }

            await audit.WriteAsync(
                AuditActions.RoomRequested,
                target: $"{section.Name}: {user.UserName}",
                details: $"{reservation.StartUtc:yyyy-MM-dd HH:mm} to {reservation.EndUtc:HH:mm} UTC",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<RoomReservationDto?> ApproveAsync(Guid id, string deciderName, CancellationToken cancellationToken = default)
        {
            var reservation = await FindTrackedAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            var approvedRooms = await unitOfWork.Repository<RoomReservation>().Query()
                .Where(r => r.SectionId == reservation.SectionId && r.Status == ReservationStatus.Approved && r.EndUtc > now)
                .ToListAsync(cancellationToken);
            var approvedTables = await (
                from table in unitOfWork.Repository<StudyTable>().Query().Where(t => t.SectionId == reservation.SectionId)
                join booking in unitOfWork.Repository<TableReservation>().Query()
                    .Where(r => r.Status == ReservationStatus.Approved && r.EndUtc > now) on table.Id equals booking.TableId
                select booking)
                .ToListAsync(cancellationToken);

            reservation.Approve(deciderName, now, approvedRooms, approvedTables);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.RoomApproved,
                target: $"{reservation.Section.Name}: {reservation.User.UserName}",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<RoomReservationDto?> RejectAsync(Guid id, string deciderName, string? reason, CancellationToken cancellationToken = default)
        {
            var reservation = await FindTrackedAsync(id, cancellationToken);
            if (reservation is null)
            {
                return null;
            }

            reservation.Reject(deciderName, DateTime.UtcNow, reason);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await audit.WriteAsync(
                AuditActions.RoomRejected,
                target: $"{reservation.Section.Name}: {reservation.User.UserName}",
                details: reservation.DecisionNote,
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        public async Task<RoomReservationDto?> CancelAsync(Guid id, string requesterId, bool isStaff, CancellationToken cancellationToken = default)
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
                AuditActions.RoomCancelled,
                target: $"{reservation.Section.Name}: {reservation.User.UserName}",
                cancellationToken: cancellationToken);

            return ToDto(reservation);
        }

        // The reservation this user already filed under the key, or null. Throws when the key was used for something else.
        private async Task<RoomReservationDto?> FindByKeyAsync(
            string userId, string key, Guid sectionId, DateTime startUtc, DateTime endUtc, CancellationToken cancellationToken)
        {
            var existing = await WithRelations(unitOfWork.Repository<RoomReservation>().Query())
                .FirstOrDefaultAsync(r => r.UserId == userId && r.IdempotencyKey == key, cancellationToken);

            if (existing is null)
            {
                return null;
            }

            if (!existing.IsSameRequestAs(sectionId, startUtc, endUtc))
            {
                throw new ReservationException("This Idempotency-Key was already used for a different reservation request.");
            }

            return ToDto(existing);
        }

        private Task<RoomReservation?> FindTrackedAsync(Guid id, CancellationToken cancellationToken) =>
            WithRelations(unitOfWork.Repository<RoomReservation>().Query(asNoTracking: false))
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        private static IQueryable<RoomReservation> WithRelations(IQueryable<RoomReservation> reservations) =>
            reservations.Include(r => r.Section).Include(r => r.User);

        // JSON dates without an offset arrive as Unspecified; the API contract is that they are UTC.
        private static DateTime AsUtc(DateTime value) =>
            value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);

        // SQL Server hands dates back with Kind Unspecified, which JSON writes without a "Z" and a browser then reads as
        // local time. Everything stored here is UTC, so say so.
        private static DateTime? AsUtc(DateTime? value) => value is null ? null : AsUtc(value.Value);

        private static RoomBusySlotDto WithUtcKinds(RoomBusySlotDto slot) =>
            slot with { StartUtc = AsUtc(slot.StartUtc), EndUtc = AsUtc(slot.EndUtc) };

        private static RoomReservationDto ToDto(RoomReservation r) => new(
            r.Id, r.SectionId, r.Section.Name, r.UserId, r.User.UserName ?? r.UserId, AsUtc(r.StartUtc), AsUtc(r.EndUtc), r.Note,
            r.Status, AsUtc(r.RequestedAtUtc), AsUtc(r.DecidedAtUtc), r.DecidedByName, r.DecisionNote);
    }
}
