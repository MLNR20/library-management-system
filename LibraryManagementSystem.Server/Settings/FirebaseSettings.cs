namespace LibraryManagementSystem.Server.Settings
{
    // Social sign-in (Google) goes through Firebase Authentication. Firebase only proves who the person is;
    // the account, roles and sessions stay in this app's own database. Leave ProjectId empty to switch social sign-in off.
    public class FirebaseSettings
    {
        public const string SectionName = "Firebase";

        // Not a secret: the project id from the Firebase console (Project settings).
        public string ProjectId { get; set; } = string.Empty;
    }
}
