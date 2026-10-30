namespace LibraryManagementSystem.Server.Dtos.Contacts
{
    public record ContactDto(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string PhoneNumber,
        string Address,
        bool IsActive,
        DateTime CreatedAt,
        DateTime UpdatedAt);
}
