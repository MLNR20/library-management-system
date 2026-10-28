using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Settings
{
    public class JwtSettings
    {
        public const string SectionName = "Jwt";

        [Required]
        public string Issuer { get; set; } = string.Empty;

        [Required]
        public string Audience { get; set; } = string.Empty;

        // HMAC-SHA256 needs at least 256 bits; supply via user-secrets or the Jwt__SigningKey env var.
        [Required, MinLength(32)]
        public string SigningKey { get; set; } = string.Empty;

        [Range(1, 1440)]
        public int AccessTokenMinutes { get; set; } = 60;
    }
}
