namespace LibraryManagementSystem.Server.Dtos.Auth
{
    public record RegisterRequest(string UserName, string FirstName, string LastName, string Email, string Password, string ConfirmPassword);
}
