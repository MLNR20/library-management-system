namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record RegisterRequest(string UserName, string Email, string Password, string ConfirmPassword);
}
