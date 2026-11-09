using System.ComponentModel.DataAnnotations;
using LibraryManagementSystem.Server.Data;
using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Models
{
    public enum ReservationStatus
    {
        // Filed by a student, waiting for a librarian.
        Pending,

        // A librarian approved it; the table or room is held for that time.
        Approved,

        // A librarian declined it.
        Rejected,

        // Withdrawn before it happened, by the student or by staff.
        Cancelled
    }

    // What a table reservation and a reading-room reservation have in common: one student's request for one thing for one
    // stretch of time, decided by a librarian. It only holds the thing once a librarian approves it. Not an entity itself;
    // its properties are mapped onto each reservation table.
    public abstract class ReservationBase
    {
        public static readonly TimeSpan MaxDuration = TimeSpan.FromHours(4);

        public const int NoteMaxLength = 300;

        public const int IdempotencyKeyMaxLength = 64;

        public Guid Id { get; set; }

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        public DateTime StartUtc { get; set; }

        public DateTime EndUtc { get; set; }

        // What the student wants it for.
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

        // The client's Idempotency-Key for the request that created this reservation. With UserId it is unique, so a
        // retried or double-submitted request finds this reservation instead of filing a second one. Null when none was sent.
        [StringLength(IdempotencyKeyMaxLength)]
        public string? IdempotencyKey { get; set; }

        // Two reservations overlap in time when each starts before the other ends; touching ends do not.
        public bool OverlapsInTime(ReservationBase other) => StartUtc < other.EndUtc && other.StartUtc < EndUtc;

        // A librarian declines it.
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

        // Only active students and visitors may reserve. what is "tables" or "reading rooms", for the message.
        protected static void EnsureCanReserve(ApplicationUser user, IEnumerable<string> roles, string what)
        {
            if (!user.IsActive)
            {
                throw new ReservationException($"This account is not active and cannot reserve {what}.");
            }

            if (!roles.Any(role => AppRoles.Borrowers.Contains(role, StringComparer.OrdinalIgnoreCase)))
            {
                throw new ReservationException($"Only users with the {AppRoles.Student} or {AppRoles.Visitor} role can reserve {what}.");
            }
        }

        // Only a future slot of up to four hours.
        protected static void EnsureValidTimes(DateTime startUtc, DateTime endUtc, DateTime nowUtc)
        {
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
        }

        // Approving is a promise that the thing is free: it must be pending, not over, and the caller found no clash.
        // clashMessage is what the caller found in the way, or null when nothing is.
        protected void ApproveUnlessClashing(string deciderName, DateTime nowUtc, string? clashMessage)
        {
            EnsurePending("approved");

            if (EndUtc <= nowUtc)
            {
                throw new ReservationException("This reservation has already passed and cannot be approved.");
            }

            if (clashMessage is not null)
            {
                throw new ReservationException(clashMessage);
            }

            Decide(ReservationStatus.Approved, deciderName, nowUtc, null);
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
