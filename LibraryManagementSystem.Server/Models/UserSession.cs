using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using LibraryManagementSystem.Server.Data;

namespace LibraryManagementSystem.Server.Models
{
    public enum RefreshOutcome
    {
        // The token was good: a new one replaces it.
        Rotated,

        // Unknown, wrong, revoked or malformed.
        Invalid,

        // The session ran out (no refresh for RefreshTokenDays).
        Expired,

        // An old, already replaced token was shown again after the grace window: it may have been stolen, so the whole
        // session is revoked.
        Reused,

        // An old token shown again moments after it was replaced (two tabs refreshing at once): refused, but harmless.
        Superseded
    }

    // One sign-in on one device. It holds the current refresh token (as a hash) and is rotated on every refresh.
    public class UserSession
    {
        // Showing the previous refresh token again within this window is a race between two tabs, not an attack.
        public static readonly TimeSpan RotationGrace = TimeSpan.FromSeconds(10);

        public Guid Id { get; set; }

        [Required]
        [StringLength(450)]
        public string UserId { get; set; } = string.Empty;

        public ApplicationUser User { get; set; } = null!;

        // SHA-256 of the current refresh token's secret, Base64. The token itself is never stored.
        [Required]
        [StringLength(64)]
        public string RefreshTokenHash { get; set; } = string.Empty;

        // The token this one replaced, kept to recognise a stolen token being replayed.
        [StringLength(64)]
        public string? PreviousRefreshTokenHash { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        // The last sign-in or refresh.
        public DateTime LastSeenAtUtc { get; set; }

        // Slides forward with every refresh.
        public DateTime ExpiresAtUtc { get; set; }

        public DateTime? RevokedAtUtc { get; set; }

        [StringLength(100)]
        public string? RevokedReason { get; set; }

        [StringLength(45)]
        public string? IpAddress { get; set; }

        [StringLength(300)]
        public string? UserAgent { get; set; }

        public bool IsActive(DateTime nowUtc) => RevokedAtUtc is null && ExpiresAtUtc > nowUtc;

        public static UserSession Start(string userId, string refreshTokenHash, DateTime nowUtc, TimeSpan lifetime, string? ipAddress, string? userAgent) => new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RefreshTokenHash = refreshTokenHash,
            CreatedAtUtc = nowUtc,
            LastSeenAtUtc = nowUtc,
            ExpiresAtUtc = nowUtc + lifetime,
            IpAddress = Truncate(ipAddress, 45),
            UserAgent = Truncate(userAgent, 300)
        };

        // Swaps in a new refresh token if the presented one is the current one. See RefreshOutcome for the other results.
        public RefreshOutcome Rotate(string presentedHash, string newHash, DateTime nowUtc, TimeSpan lifetime)
        {
            if (RevokedAtUtc is not null)
            {
                return RefreshOutcome.Invalid;
            }

            if (!SameHash(presentedHash, RefreshTokenHash))
            {
                if (PreviousRefreshTokenHash is not null && SameHash(presentedHash, PreviousRefreshTokenHash))
                {
                    if (nowUtc - LastSeenAtUtc <= RotationGrace)
                    {
                        return RefreshOutcome.Superseded;
                    }

                    Revoke(nowUtc, "Refresh token reuse detected");

                    return RefreshOutcome.Reused;
                }

                return RefreshOutcome.Invalid;
            }

            if (ExpiresAtUtc <= nowUtc)
            {
                return RefreshOutcome.Expired;
            }

            PreviousRefreshTokenHash = RefreshTokenHash;
            RefreshTokenHash = newHash;
            LastSeenAtUtc = nowUtc;
            ExpiresAtUtc = nowUtc + lifetime;

            return RefreshOutcome.Rotated;
        }

        // Revoking twice keeps the first time and reason.
        public void Revoke(DateTime nowUtc, string reason)
        {
            if (RevokedAtUtc is not null)
            {
                return;
            }

            RevokedAtUtc = nowUtc;
            RevokedReason = Truncate(reason, 100);
        }

        private static bool SameHash(string a, string b) =>
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));

        private static string? Truncate(string? value, int max) =>
            string.IsNullOrEmpty(value) ? null : value.Length <= max ? value : value[..max];
    }
}
