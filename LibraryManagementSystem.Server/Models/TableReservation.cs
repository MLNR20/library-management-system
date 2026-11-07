using System.ComponentModel.DataAnnotations;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Models
{
    public enum ReservationStatus
    {
        // Filed by a student, waiting for a librarian.
        Pending,

        // A librarian approved it; the table is held for that time.
        Approved,

        // A librarian declined it.
        Rejected,

        // Withdrawn before it happened, by the student or by staff.
        Cancelled
    }

    // One student's request for one table for one stretch of time. It only holds the table once a librarian approves it.
    public class TableReservation
    {
        public static readonly TimeSpan MaxDuration = TimeSpan.FromHours(4);

        public const int NoteMaxLength = 300;

        public Guid Id { get; set; }

        public Guid TableId { get; set; }

        public StudyTable Table { get; set; } = null!;

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        public DateTime StartUtc { get; set; }

        public DateTime EndUtc { get; set; }

        // What the student wants the table for.
        [StringLength(NoteMaxLength)]
        public string? Note { get; set; }

        public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

        public DateTime RequestedAtUtc { get; set; }

        // Set when a librarian approves or rejects it.
        public DateTime? DecidedAtUtc { get; set; }

        [StringLength(256)]
        public string? DecidedByName { get; set; }

        // The librarian's reason, mainly for a rejection.
        [StringLength(NoteMaxLength)]
        public string? DecisionNote { get; set; }

        // Two reservations clash when they are for the same table and their times overlap; touching ends do not clash.
        public bool ClashesWith(TableReservation other) =>
            TableId == other.TableId && StartUtc < other.EndUtc && other.StartUtc < EndUtc;

        // Only active students and visitors may reserve, only active tables, and only for a future slot of up to four hours.
        public static TableReservation Request(
            StudyTable table, ApplicationUser user, IEnumerable<string> roles, DateTime startUtc, DateTime endUtc, string? note, DateTime nowUtc)
        {
            if (!user.IsActive)
            {
                throw new ReservationException("This account is not active and cannot reserve tables.");
            }

            if (!roles.Any(role => AppRoles.Borrowers.Contains(role, StringComparer.OrdinalIgnoreCase)))
            {
                throw new ReservationException($"Only users with the {AppRoles.Student} or {AppRoles.Visitor} role can reserve tables.");
            }

            if (!table.IsActive)
            {
                throw new ReservationException($"'{table.Name}' is out of service and cannot be reserved.");
            }

            if (endUtc <= startUtc)
            {
                throw new ReservationException("The reservation must end after it starts.");
            }

            if (startUtc <= nowUtc)
            {
                throw new ReservationException("The reservation must start in the future.");
            }

            if (endUtc - startUtc > MaxDuration)
            {
                throw new ReservationException($"A reservation can last at most {MaxDuration.TotalHours:0} hours.");
            }

            return new TableReservation
            {
                Id = Guid.NewGuid(),
                Table = table,
                TableId = table.Id,
                User = user,
                UserId = user.Id,
                StartUtc = startUtc,
                EndUtc = endUtc,
                Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
                Status = ReservationStatus.Pending,
                RequestedAtUtc = nowUtc
            };
        }

        // A librarian approves it. approvedOnSameTable are the table's already approved reservations: the new one may not
        // clash with any, because an approval is a promise that the table is free.
        public void Approve(string deciderName, DateTime nowUtc, IEnumerable<TableReservation> approvedOnSameTable)
        {
            EnsurePending("approved");

            if (EndUtc <= nowUtc)
            {
                throw new ReservationException("This reservation has already passed and cannot be approved.");
            }

            if (approvedOnSameTable.Any(other => other.Id != Id && other.Status == ReservationStatus.Approved && ClashesWith(other)))
            {
                throw new ReservationException($"'{Table.Name}' is already reserved for part of that time.");
            }

            Decide(ReservationStatus.Approved, deciderName, nowUtc, null);
        }

        public void Reject(string deciderName, DateTime nowUtc, string? reason)
        {
            EnsurePending("rejected");
            Decide(ReservationStatus.Rejected, deciderName, nowUtc, reason);
        }

        // Withdrawn by the student or by staff while it is pending or approved and has not finished.
        public void Cancel(DateTime nowUtc)
        {
            if (Status is not (ReservationStatus.Pending or ReservationStatus.Approved))
            {
                throw new ReservationException($"A {Status.ToString().ToLowerInvariant()} reservation cannot be cancelled.");
            }

            if (EndUtc <= nowUtc)
            {
                throw new ReservationException("This reservation has already finished.");
            }

            Status = ReservationStatus.Cancelled;
        }

        private void EnsurePending(string verb)
        {
            if (Status != ReservationStatus.Pending)
            {
                throw new ReservationException($"Only a pending reservation can be {verb}; this one is {Status.ToString().ToLowerInvariant()}.");
            }
        }

        private void Decide(ReservationStatus status, string deciderName, DateTime nowUtc, string? note)
        {
            Status = status;
            DecidedAtUtc = nowUtc;
            DecidedByName = deciderName;
            DecisionNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        }
    }

    // A reservation rule was broken (ineligible student, table out of service, bad time, clash, wrong status).
    public class ReservationException(string message) : InvalidOperationException(message);
}
