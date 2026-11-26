namespace LibraryManagementSystem.Server.Settings
{
    // The SMTP server mail goes out through. Leave Host empty to send nothing: in Development the message is then written
    // to the log instead, so a reset link can be used without a mail account. Keep Password in user-secrets.
    public class EmailSettings
    {
        public const string SectionName = "Email";

        public string Host { get; set; } = string.Empty;

        // 587 is SMTP with STARTTLS, which is what EnableSsl uses. Port 465 (implicit TLS) is not supported.
        public int Port { get; set; } = 587;

        public bool EnableSsl { get; set; } = true;

        // Empty for a server that takes mail without signing in.
        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FromAddress { get; set; } = string.Empty;

        public string FromName { get; set; } = "Library";

        public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);
    }
}
