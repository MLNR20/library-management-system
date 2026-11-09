namespace LibraryManagementSystem.Server.Services
{
    public static class AuditActions
    {
        public const string Login = "Auth.Login";
        public const string LoginFailed = "Auth.LoginFailed";
        public const string Logout = "Auth.Logout";
        public const string Register = "Auth.Register";
        public const string TokenRefreshReused = "Auth.RefreshReuse";
        public const string SessionRevoked = "Session.Revoked";

        public const string RoleCreated = "Role.Created";
        public const string RoleRenamed = "Role.Renamed";
        public const string RoleDeleted = "Role.Deleted";

        public const string RoleAssigned = "User.RoleAssigned";
        public const string RoleRemoved = "User.RoleRemoved";

        public const string ClockIn = "Clock.In";
        public const string ClockOut = "Clock.Out";

        public const string BookBorrowed = "Borrowing.Borrowed";
        public const string BookReturned = "Borrowing.Returned";

        public const string TableRequested = "Table.Requested";
        public const string TableApproved = "Table.Approved";
        public const string TableRejected = "Table.Rejected";
        public const string TableCancelled = "Table.Cancelled";

        public const string RoomRequested = "Room.Requested";
        public const string RoomApproved = "Room.Approved";
        public const string RoomRejected = "Room.Rejected";
        public const string RoomCancelled = "Room.Cancelled";

        public const string UserActivated = "User.Activated";
        public const string UserDeactivated = "User.Deactivated";

        // Catalogue changes are recorded by AuditSaveChangesInterceptor as "{Entity}.Created|Updated|Deleted".
    }
}
