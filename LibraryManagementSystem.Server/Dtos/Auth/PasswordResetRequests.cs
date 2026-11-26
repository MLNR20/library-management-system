namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record ForgotPasswordRequest(string Email);

    // UserId and Token are the two values carried by the emailed link.
    public record ResetPasswordRequest(string UserId, string Token, string Password, string ConfirmPassword);
}
