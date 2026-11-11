using Microsoft.AspNetCore.Identity;

namespace LibraryManagementSystem.Server.Data
{
    public class ApplicationUser : IdentityUser
    {
        // Deactivated users keep their history but cannot borrow books.
        public bool IsActive { get; set; } = true;

        // Shown on the welcome card. Accounts made before names existed have both empty.
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;
    }
}
