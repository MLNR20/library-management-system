using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Models
{
    // One row per security-relevant event (sign-ins, role changes) or catalogue change.
    // UserId/UserName are copied, not foreign keys, so the trail survives a user being deleted.
    public class AuditLog
    {
        public Guid Id { get; set; }

        public DateTime TimestampUtc { get; set; }

        // "Area.Event", e.g. "Auth.Login" or "Book.Updated"; see AuditActions.
        [Required]
        [StringLength(100)]
        public string Action { get; set; } = string.Empty;

        public bool Success { get; set; } = true;

        [StringLength(450)]
        public string? UserId { get; set; }

        [StringLength(256)]
        public string? UserName { get; set; }

        [StringLength(45)]
        public string? IpAddress { get; set; }

        [StringLength(300)]
        public string? UserAgent { get; set; }

        // What the action was done to, e.g. a role name or "Book: Dune".
        [StringLength(300)]
        public string? Target { get; set; }

        [StringLength(1000)]
        public string? Details { get; set; }
    }
}
