namespace LibraryManagementSystem.Server.Settings
{
    public static class RateLimitPolicies
    {
        // Stricter per-client limit for login/register style endpoints: [EnableRateLimiting(RateLimitPolicies.Auth)]
        public const string Auth = "auth";
    }
}
