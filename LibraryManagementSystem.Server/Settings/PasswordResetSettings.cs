using System.ComponentModel.DataAnnotations;

namespace LibraryManagementSystem.Server.Settings
{
    public class PasswordResetSettings
    {
        public const string SectionName = "PasswordReset";

        // Where the web app is served, e.g. https://library.example.com. Reset links point here. It comes from
        // configuration and never from the request, whose Host header a stranger could set to their own site.
        public string ClientUrl { get; set; } = string.Empty;

        [Range(5, 1440)]
        public int TokenLifetimeMinutes { get; set; } = 60;

        // The least time between two emails to one account, so the form cannot be used to flood someone's inbox.
        [Range(0, 3600)]
        public int ResendCooldownSeconds { get; set; } = 60;
    }
}
