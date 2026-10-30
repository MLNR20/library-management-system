namespace LibraryManagementSystem.Server.Settings
{
    public static class AppRoles
    {
        // Built in: created at startup, cannot be renamed or deleted, and at least one user must always hold it.
        // Grants access to the audit log and to role and user management: [Authorize(Roles = AppRoles.Administrator)]
        public const string Administrator = "Administrator";

        // Created at startup. Librarians clock in and out and have time cards; administrators can too.
        public const string Librarian = "Librarian";

        // For [Authorize(Roles = AppRoles.Staff)]: either role passes.
        public const string Staff = Administrator + "," + Librarian;

        // Created at startup. These are the only roles allowed to borrow books.
        public const string Student = "Student";
        public const string Visitor = "Visitor";

        public static readonly IReadOnlyList<string> Borrowers = [Student, Visitor];
    }
}
