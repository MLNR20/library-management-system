namespace LibraryManagementSystem.Server.Settings
{
    public static class AppRoles
    {
        // Built in: created at startup, cannot be renamed or deleted, and at least one user must always hold it.
        // Grants access to the audit log and to role and user management: [Authorize(Roles = AppRoles.Administrator)]
        public const string Administrator = "Administrator";
    }
}
