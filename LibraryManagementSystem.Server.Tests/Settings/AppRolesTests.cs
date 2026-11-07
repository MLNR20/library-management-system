using LibraryManagementSystem.Server.Settings;

namespace LibraryManagementSystem.Server.Tests.Settings
{
    public class AppRolesTests
    {
        [Fact]
        public void Borrowers_are_exactly_student_and_visitor()
        {
            Assert.Equal([AppRoles.Student, AppRoles.Visitor], AppRoles.Borrowers);
        }

        [Fact]
        public void Staff_policy_contains_administrator_and_librarian_only()
        {
            var roles = AppRoles.Staff.Split(',');

            Assert.Equal([AppRoles.Administrator, AppRoles.Librarian], roles);
        }

        [Fact]
        public void No_staff_role_can_borrow()
        {
            Assert.DoesNotContain(AppRoles.Administrator, AppRoles.Borrowers);
            Assert.DoesNotContain(AppRoles.Librarian, AppRoles.Borrowers);
        }
    }
}
