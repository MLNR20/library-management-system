namespace LibraryManagementSystem.Server.Dtos.Contacts
{
    // CreatedAt and UpdatedAt are set by the server.
    public record ContactRequest(
        string FirstName,
        string LastName,
        string Email,
        string PhoneNumber,
        string Address,
        bool IsActive = true);
}
