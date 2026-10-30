namespace LibraryManagementSystem.Server.Services
{
    public static class AuditActions
    {
        public const string Login = "Auth.Login";
        public const string LoginFailed = "Auth.LoginFailed";
        public const string Logout = "Auth.Logout";
        public const string Register = "Auth.Register";

        public const string RoleCreated = "Role.Created";
        public const string RoleRenamed = "Role.Renamed";
        public const string RoleDeleted = "Role.Deleted";

        public const string RoleAssigned = "User.RoleAssigned";
        public const string RoleRemoved = "User.RoleRemoved";

        public const string ClockIn = "Clock.In";
        public const string ClockOut = "Clock.Out";

        // Catalogue changes are recorded by AuditSaveChangesInterceptor as "{Entity}.Created|Updated|Deleted".
    }
}
