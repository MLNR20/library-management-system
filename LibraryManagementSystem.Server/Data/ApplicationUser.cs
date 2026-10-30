using Microsoft.AspNetCore.Identity;

namespace LibraryManagementSystem.Server.Data
{
    public class ApplicationUser : IdentityUser
    {
        // Deactivated users keep their history but cannot borrow books.
        public bool IsActive { get; set; } = true;
    }
}
